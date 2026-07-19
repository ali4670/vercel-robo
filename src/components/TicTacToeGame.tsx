import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../lib/LanguageContext";
import { useAuth } from "../hooks/use-auth";
import { supabase } from "../lib/supabase-code";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { HeroButton } from "../funs/HeroButton";

type CellValue = "X" | "O" | null;
type Winner = "X" | "O" | "draw" | null;

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: CellValue[]): Winner {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as "X" | "O";
    }
  }
  if (board.every((cell) => cell !== null)) return "draw";
  return null;
}

function getWinningLine(board: CellValue[]): number[] | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return [a, b, c];
    }
  }
  return null;
}

interface TicTacToeGameProps {
  onlineGameId?: string | null;
  onQuit?: () => void;
}

export default function TicTacToeGame({
  onlineGameId,
  onQuit,
}: TicTacToeGameProps) {
  const { isAr } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<Winner>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [mySymbol, setMySymbol] = useState<"X" | "O" | null>(null);

  const t = {
    title: isAr ? "لعبة إكس أو" : "X-O Game",
    subtitle: isAr
      ? onlineGameId
        ? "تحدي مباشر"
        : "لعبة كلاسيكية"
      : onlineGameId
        ? "Online Match"
        : "Classic Game",
    scoreX: isAr ? "إكس" : "Player X",
    scoreO: isAr ? "أو" : "Player O",
    draws: isAr ? "تعادل" : "Draws",
    turn: isAr ? "دور اللاعب" : "Player Turn",
    drawResult: isAr ? "تعادل!" : "Draw!",
    winnerResult: isAr ? "الفائز" : "Winner",
    newGame: isAr ? "لعبة جديدة" : "New Game",
    resetScores: isAr ? "تصفير النتائج" : "Reset Scores",
    quit: isAr ? "انسحاب" : "Quit Game",
    waiting: isAr ? "في انتظار دور الخصم..." : "Waiting for opponent...",
    yourTurn: isAr ? "دورك الآن!" : "Your turn!",
  };

  // Online Game Sync
  useEffect(() => {
    if (!onlineGameId) {
      setMySymbol(null);
      return;
    }

    const fetchGame = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", onlineGameId)
        .single();

      if (data) {
        setBoard(data.board as CellValue[]);
        setCurrentPlayer(data.current_turn as "X" | "O");
        setWinner(data.winner as Winner);
        setWinningLine(getWinningLine(data.board as CellValue[]));
        setMySymbol(data.player_x === user?.id ? "X" : "O");
      }
    };

    fetchGame();

    const channel = supabase
      .channel(`game_sync_${onlineGameId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          table: "games",
          filter: `id=eq.${onlineGameId}`,
        },
        (payload: any) => {
          setBoard(payload.new.board as CellValue[]);
          setCurrentPlayer(payload.new.current_turn as "X" | "O");
          setWinner(payload.new.winner as Winner);
          setWinningLine(getWinningLine(payload.new.board as CellValue[]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onlineGameId, user]);

  const handleCellClick = useCallback(
    async (index: number) => {
      if (board[index] || winner) return;

      // If online game, check if it's my turn
      if (onlineGameId && currentPlayer !== mySymbol) {
        toast.error(t.waiting);
        return;
      }

      const newBoard = [...board];
      newBoard[index] = currentPlayer;

      const result = checkWinner(newBoard);
      const nextPlayer = currentPlayer === "X" ? "O" : "X";

      if (onlineGameId) {
        // Sync with Supabase
        const { error } = await supabase
          .from("games")
          .update({
            board: newBoard,
            current_turn: nextPlayer,
            winner: result,
            status: result ? "completed" : "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", onlineGameId);

        if (error) {
          toast.error(error.message);
          return;
        }
      } else {
        // Local state update
        setBoard(newBoard);
        if (result) {
          setWinner(result);
          setWinningLine(getWinningLine(newBoard));
          if (result === "X" || result === "O") {
            setScores((s) => ({ ...s, [result]: s[result] + 1 }));
          } else {
            setScores((s) => ({ ...s, draws: s.draws + 1 }));
          }
        } else {
          setCurrentPlayer(nextPlayer);
        }
      }

      // Add points for wins
      if (result && result !== "draw" && user && profile) {
        // Only give points if user was the winner
        const wasWinner = onlineGameId ? result === mySymbol : true;
        if (wasWinner) {
          await supabase
            .from("profiles")
            .update({ score: (profile.score || 0) + 10 })
            .eq("id", user.id);
          refreshProfile();
        }
      }
    },
    [
      board,
      currentPlayer,
      winner,
      user,
      profile,
      refreshProfile,
      onlineGameId,
      mySymbol,
      t.waiting,
    ],
  );

  const resetGame = useCallback(async () => {
    if (onlineGameId) {
      // In online game, reset needs both players ideally, but here we just reset board
      await supabase
        .from("games")
        .update({
          board: Array(9).fill(null),
          current_turn: "X",
          winner: null,
          status: "active",
        })
        .eq("id", onlineGameId);
    } else {
      setBoard(Array(9).fill(null));
      setCurrentPlayer("X");
      setWinner(null);
      setWinningLine(null);
    }
  }, [onlineGameId]);

  return (
    <div className="flex flex-col items-center gap-12 w-full max-w-lg mx-auto px-6 py-10 relative z-10 group/game">
      {/* Decorative HUD Elements */}
      <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-lime-500/30 rounded-tl-3xl" />
      <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-emerald-500/30 rounded-br-3xl" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="flex items-center justify-center gap-4">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-lime-500/50" />
          <h1 className="text-5xl font-black tracking-tighter text-foreground italic">
            ARENA<span className="text-lime-500">.</span>
          </h1>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-emerald-500/50" />
        </div>
        <p className="text-[10px] font-black text-lime-500/40 uppercase tracking-[0.5em]">
          {t.subtitle}
        </p>
      </motion.div>

      <div className="flex items-center gap-4 w-full">
        <ScoreCard
          label={t.scoreX}
          score={scores.X}
          color="x"
          highlight={currentPlayer === "X"}
        />
        <div className="flex flex-col items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-muted" />
          <div className="w-1.5 h-1.5 rounded-full bg-muted" />
          <div className="w-1.5 h-1.5 rounded-full bg-muted" />
        </div>
        <ScoreCard
          label={t.scoreO}
          score={scores.O}
          color="o"
          highlight={currentPlayer === "O"}
        />
      </div>

      <div className="h-14 flex items-center justify-center w-full">
        <AnimatePresence mode="wait">
          {!winner && (
            <motion.div
              key={currentPlayer}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="px-8 py-3 rounded-2xl bg-muted/30 border border-border backdrop-blur-xl shadow-2xl flex items-center gap-4">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  {t.turn}
                </span>
                <span
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-xl shadow-inner ${currentPlayer === "X" ? "bg-lime-500 text-black shadow-lime-500/20" : "bg-emerald-500 text-foreground shadow-emerald-500/20"}`}
                >
                  {currentPlayer}
                </span>
              </div>
              {onlineGameId && (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`text-[9px] font-black uppercase tracking-[0.3em] ${currentPlayer === mySymbol ? "text-lime-400" : "text-muted-foreground"}`}
                >
                  {currentPlayer === mySymbol ? t.yourTurn : t.waiting}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              className="text-center"
            >
              <div
                className={`inline-block px-12 py-4 rounded-2xl font-black text-xl border-2 backdrop-blur-3xl shadow-2xl ${winner === "draw" ? "bg-muted/50 text-muted-foreground border-border" : winner === "X" ? "bg-lime-500/10 text-lime-400 border-lime-500/30 shadow-lime-500/10" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10"}`}
              >
                {winner === "draw"
                  ? t.drawResult
                  : `${t.winnerResult}: ${winner === "X" ? t.scoreX : t.scoreO}!`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group/board"
      >
        {/* Board Shadow Glow */}
        <div className="absolute inset-0 bg-lime-500/5 blur-[100px] rounded-full opacity-0 group-hover/board:opacity-100 transition-opacity duration-1000" />

        <div className="grid grid-cols-3 gap-5 p-6 rounded-[56px] border border-border bg-muted/30 backdrop-blur-3xl relative">
          {board.map((cell, index) => (
            <Cell
              key={index}
              value={cell}
              index={index}
              isWinning={winningLine?.includes(index) ?? false}
              isClickable={
                !cell &&
                !winner &&
                (!onlineGameId || currentPlayer === mySymbol)
              }
              onClick={() => handleCellClick(index)}
            />
          ))}
        </div>
      </motion.div>

      <div className="flex gap-4 w-full">
        {onlineGameId ? (
          <HeroButton
            onClick={onQuit}
            variant="outline"
            className="flex-1 py-5 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            {t.quit}
          </HeroButton>
        ) : (
          <>
            <HeroButton
              onClick={resetGame}
              variant="primary"
              className="flex-1 py-5"
            >
              {t.newGame}
            </HeroButton>
            <HeroButton
              onClick={() => setScores({ X: 0, O: 0, draws: 0 })}
              variant="outline"
              className="flex-1 py-5"
            >
              {t.resetScores}
            </HeroButton>
          </>
        )}
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  color,
  highlight,
}: {
  label: string;
  score: number;
  color: "x" | "o" | "neutral";
  highlight: boolean;
}) {
  const colorClass =
    color === "x"
      ? "text-lime-400"
      : color === "o"
        ? "text-emerald-400"
        : "text-muted-foreground";
  return (
    <div
      className={`flex-1 flex flex-col items-center gap-2 py-6 rounded-[32px] bg-muted/30 border transition-all duration-700 backdrop-blur-2xl ${highlight ? "border-border bg-muted/50 scale-105 shadow-2xl" : "border-border opacity-30"}`}
    >
      <span
        className={`text-[9px] font-black uppercase tracking-[0.3em] ${colorClass}`}
      >
        {label}
      </span>
      <motion.span
        key={score}
        initial={{ scale: 1.5, filter: "blur(10px)" }}
        animate={{ scale: 1, filter: "blur(0px)" }}
        className="text-4xl font-black text-foreground tracking-tighter italic"
      >
        {score}
      </motion.span>
    </div>
  );
}

function Cell({
  value,
  index,
  isWinning,
  isClickable,
  onClick,
}: {
  value: CellValue;
  index: number;
  isWinning: boolean;
  isClickable: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={
        isClickable
          ? { scale: 1.02, backgroundColor: "rgba(255,255,255,0.06)" }
          : {}
      }
      whileTap={isClickable ? { scale: 0.94 } : {}}
      onClick={onClick}
      className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-[32px] flex items-center justify-center text-6xl font-black transition-all border-2 ${isClickable ? "cursor-pointer bg-muted/30 border-border hover:border-border" : "cursor-default bg-foreground/10 border-border"} ${isWinning ? "bg-muted border-white shadow-[0_0_50px_rgba(255,255,255,0.1)] z-10 scale-105" : ""}`}
    >
      <AnimatePresence mode="wait">
        {value && (
          <motion.span
            key={`${index}-${value}`}
            initial={{
              opacity: 0,
              scale: 0.5,
              rotate: -15,
              filter: "blur(10px)",
            }}
            animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`italic ${value === "X" ? "text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]" : "text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]"}`}
          >
            {value}
          </motion.span>
        )}
      </AnimatePresence>
      {/* Corner Accents */}
      {!value && isClickable && (
        <div className="absolute inset-2 border border-border rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </motion.button>
  );
}
