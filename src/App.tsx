import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Sparkles, 
  Trophy, 
  RotateCcw, 
  ArrowRight, 
  Search, 
  Heart, 
  Timer, 
  Volume2, 
  VolumeX, 
  Bookmark, 
  Award, 
  BookMarked,
  CheckCircle2, 
  X, 
  ChevronRight,
  Info,
  HelpCircle,
  Home,
  BookmarkCheck,
  RotateCw
} from 'lucide-react';
import { IDIOMS_DATA } from './idiomsData';
import { playSound } from './utils/audio';
import { AppMode, Idiom, QuizQuestion, QuizHistoryItem, UserStats } from './types';

// Initial stats setup
const LOCAL_STORAGE_KEY = 'korean_idioms_quiz_stats';
const DEFAULT_STATS: UserStats = {
  timesPracticePlayed: 0,
  timesChallengePlayed: 0,
  challengeHighScore: 0,
  correctCount: 0,
  incorrectCount: 0,
  learnedIdiomIds: [],
  bookmarkedIdiomIds: []
};

// Help helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function App() {
  // App main states
  const [mode, setMode] = useState<AppMode>('home');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  
  // User statistics & save
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);

  // Load stats on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setStats({ ...DEFAULT_STATS, ...parsed });
      }
    } catch (e) {
      console.error("Failed to load stats from localStorage", e);
    }
  }, []);

  // Sync stats helper
  const updateStats = (updater: (prev: UserStats) => UserStats) => {
    setStats(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save stats to localStorage", e);
      }
      return next;
    });
  };

  const handlePlaySound = (type: "correct" | "incorrect" | "click" | "victory" | "gameover") => {
    if (audioEnabled) {
      playSound(type);
    }
  };

  // State for active Practice/Challenge Quiz
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  
  // Challenge State specific
  const [lives, setLives] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [score, setScore] = useState<number>(0);
  const [isTimeOut, setIsTimeOut] = useState<boolean>(false);
  const challengeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dictionary States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dictionaryFilter, setDictionaryFilter] = useState<'all' | 'bookmarked' | 'learned'>('all');
  const [selectedDictIdiom, setSelectedDictIdiom] = useState<Idiom | null>(null);

  // Notification Toast state (e.g. "도전 최고기록 달성!")
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Initiate Normal Practice Quiz
  const startPracticeMode = () => {
    handlePlaySound('click');
    const shuffledIdioms = shuffleArray(IDIOMS_DATA);
    
    // Generate questions for all 55 idioms!
    const questions = shuffledIdioms.map(target => {
      const distractors = IDIOMS_DATA.filter(idx => idx.id !== target.id);
      const shuffledDistractors = shuffleArray(distractors);
      const pickedOptions = shuffledDistractors.slice(0, 3).map(i => i.meaning);
      pickedOptions.push(target.meaning);
      const finalOptions = shuffleArray(pickedOptions);
      return {
        idiom: target,
        options: finalOptions,
        correctAnswerIndex: finalOptions.indexOf(target.meaning)
      };
    });

    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setHasAnswered(false);
    setQuizHistory([]);
    setMode('quiz_practice');
    
    updateStats(prev => ({
      ...prev,
      timesPracticePlayed: prev.timesPracticePlayed + 1
    }));
  };

  // Initiate Challenge Quiz
  const startChallengeMode = () => {
    handlePlaySound('click');
    const shuffledIdioms = shuffleArray(IDIOMS_DATA);
    
    // Pick 10 random questions for Challenge
    const pickedIdioms = shuffledIdioms.slice(0, 10);
    const questions = pickedIdioms.map(target => {
      const distractors = IDIOMS_DATA.filter(idx => idx.id !== target.id);
      const shuffledDistractors = shuffleArray(distractors);
      const pickedOptions = shuffledDistractors.slice(0, 3).map(i => i.meaning);
      pickedOptions.push(target.meaning);
      const finalOptions = shuffleArray(pickedOptions);
      return {
        idiom: target,
        options: finalOptions,
        correctAnswerIndex: finalOptions.indexOf(target.meaning)
      };
    });

    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setHasAnswered(false);
    setQuizHistory([]);
    setLives(3);
    setScore(0);
    setTimeLeft(15);
    setIsTimeOut(false);
    setMode('quiz_challenge');

    updateStats(prev => ({
      ...prev,
      timesChallengePlayed: prev.timesChallengePlayed + 1
    }));
  };

  // Start direct single practice quiz for a selected bookmarked idiom
  const startSingleIdiomPractice = (idiom: Idiom) => {
    handlePlaySound('click');
    const distractors = IDIOMS_DATA.filter(idx => idx.id !== idiom.id);
    const shuffledDistractors = shuffleArray(distractors);
    const pickedOptions = shuffledDistractors.slice(0, 3).map(i => i.meaning);
    pickedOptions.push(idiom.meaning);
    const finalOptions = shuffleArray(pickedOptions);
    const singleQuestion: QuizQuestion = {
      idiom,
      options: finalOptions,
      correctAnswerIndex: finalOptions.indexOf(idiom.meaning)
    };

    setQuizQuestions([singleQuestion]);
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setHasAnswered(false);
    setQuizHistory([]);
    setMode('quiz_practice');
  };

  // Timer logic for challenge mode
  useEffect(() => {
    if (mode === 'quiz_challenge' && !hasAnswered && !isTimeOut) {
      challengeIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(challengeIntervalRef.current!);
            handleChallengeTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (challengeIntervalRef.current) {
        clearInterval(challengeIntervalRef.current);
      }
    };
  }, [mode, currentQuestionIndex, hasAnswered, isTimeOut]);

  // Handle Challenge Timeout
  const handleChallengeTimeout = () => {
    handlePlaySound('incorrect');
    setIsTimeOut(true);
    setHasAnswered(true);
    setSelectedAnswerIndex(-1); // None selected
    
    const currentQ = quizQuestions[currentQuestionIndex];
    setLives(prev => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        setTimeout(() => {
          handlePlaySound('gameover');
        }, 600);
      }
      return nextLives;
    });

    setQuizHistory(prev => [
      ...prev,
      {
        idiom: currentQ.idiom,
        selectedAnswer: "시간 초과 (미응답)",
        correctAnswer: currentQ.options[currentQ.correctAnswerIndex],
        isCorrect: false
      }
    ]);

    updateStats(prev => ({
      ...prev,
      incorrectCount: prev.incorrectCount + 1
    }));
  };

  // Handle selecting an answer
  const handleAnswerSelection = (index: number) => {
    if (hasAnswered) return; // Prevent double answering
    
    // Stop challenge timer if active
    if (challengeIntervalRef.current) {
      clearInterval(challengeIntervalRef.current);
    }

    const currentQ = quizQuestions[currentQuestionIndex];
    const isCorrect = index === currentQ.correctAnswerIndex;
    setSelectedAnswerIndex(index);
    setHasAnswered(true);

    if (isCorrect) {
      handlePlaySound('correct');
      // Calculate score for Challenge Mode (based on time left)
      if (mode === 'quiz_challenge') {
        const bonusPoints = timeLeft * 10;
        setScore(prev => prev + 100 + bonusPoints);
      }

      // Add to learned list if not already
      updateStats(prev => {
        const nextLearned = prev.learnedIdiomIds.includes(currentQ.idiom.id)
          ? prev.learnedIdiomIds
          : [...prev.learnedIdiomIds, currentQ.idiom.id];
        return {
          ...prev,
          correctCount: prev.correctCount + 1,
          learnedIdiomIds: nextLearned
        };
      });
    } else {
      handlePlaySound('incorrect');
      if (mode === 'quiz_challenge') {
        setLives(prev => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            setTimeout(() => {
              handlePlaySound('gameover');
            }, 600);
          }
          return nextLives;
        });
      }

      updateStats(prev => ({
        ...prev,
        incorrectCount: prev.incorrectCount + 1
      }));
    }

    setQuizHistory(prev => [
      ...prev,
      {
        idiom: currentQ.idiom,
        selectedAnswer: currentQ.options[index],
        correctAnswer: currentQ.options[currentQ.correctAnswerIndex],
        isCorrect
      }
    ]);
  };

  // Handle transition to next question or end
  const handleNextQuestion = () => {
    handlePlaySound('click');
    const isLastQuestion = currentQuestionIndex >= quizQuestions.length - 1;
    const isDead = mode === 'quiz_challenge' && lives <= 0;

    if (isLastQuestion || isDead) {
      // End game
      if (mode === 'quiz_challenge') {
        if (score > stats.challengeHighScore) {
          showToast(`🏆 새로운 우수 기록 달성: ${score}점!`);
          updateStats(prev => ({
            ...prev,
            challengeHighScore: score
          }));
        }
        handlePlaySound('victory');
      }
      setHasAnswered(false);
      setSelectedAnswerIndex(null);
    } else {
      // Continue to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswerIndex(null);
      setHasAnswered(false);
      setIsTimeOut(false);
      setTimeLeft(15);
    }
  };

  const toggleBookmark = (id: number) => {
    handlePlaySound('click');
    updateStats(prev => {
      const isBookmarked = prev.bookmarkedIdiomIds.includes(id);
      const nextBookmarks = isBookmarked
        ? prev.bookmarkedIdiomIds.filter(bId => bId !== id)
        : [...prev.bookmarkedIdiomIds, id];
      return {
        ...prev,
        bookmarkedIdiomIds: nextBookmarks
      };
    });
  };

  // Filter dictionary list
  const filteredIdioms = IDIOMS_DATA.filter(idiom => {
    const matchesSearch = 
      idiom.phrase.toLowerCase().includes(searchQuery.toLowerCase()) || 
      idiom.meaning.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (dictionaryFilter === 'bookmarked') {
      return matchesSearch && stats.bookmarkedIdiomIds.includes(idiom.id);
    }
    if (dictionaryFilter === 'learned') {
      return matchesSearch && stats.learnedIdiomIds.includes(idiom.id);
    }
    return matchesSearch;
  });

  // Calculate learning percentage
  const bookmarkedCount = stats.bookmarkedIdiomIds.length;
  const learnedCount = stats.learnedIdiomIds.length;
  const masteryPercentage = Math.round((learnedCount / IDIOMS_DATA.length) * 100);

  // Return dynamic title based on mastery
  const getMasteryRank = (percentage: number) => {
    if (percentage === 100) return '국어대선생 (문학 박사)';
    if (percentage >= 80) return '관용어 학자';
    if (percentage >= 50) return '훈장님 지망생';
    if (percentage >= 20) return '글공부 유생';
    return '의욕적인 새싹';
  };

  return (
    <div className="min-h-screen flex flex-col antialiased text-[#2D2B2A]">
      {/* Red lacquered seal / Traditional decoration header */}
      <header className="sticky top-0 z-30 bg-[#FBF9F4]/90 backdrop-blur-md border-b border-[#E6DEC9] px-4 py-3 md:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              id="header-brand-logo"
              className="flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-[#4D7C66] rounded cursor-pointer"
              onClick={() => { handlePlaySound('click'); setMode('home'); }}
            >
              {/* traditional red seal */}
              <div className="w-9 h-9 bg-[#BF5E5A] rounded-md flex items-center justify-center text-white font-bold text-lg border-2 border-double border-[#F5EFE6] shadow-sm select-none">
                <span className="gowun-batang">관</span>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-[#2E2C2A] gowun-batang">관용어 도감 퀴즈</h1>
                <p className="text-[10px] text-[#A69984] font-medium tracking-widest uppercase">Traditional Korean Idioms</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <nav className="flex items-center gap-1 md:gap-2">
              <button
                id="nav-home"
                onClick={() => { handlePlaySound('click'); setMode('home'); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  mode === 'home' 
                    ? 'bg-[#4D7C66] text-white' 
                    : 'text-[#5C5549] hover:bg-[#F2ECE0]'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">처음으로</span>
              </button>
              
              <button
                id="nav-dictionary"
                onClick={() => { handlePlaySound('click'); setMode('dictionary'); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  mode === 'dictionary'
                    ? 'bg-[#4D7C66] text-white'
                    : 'text-[#5C5549] hover:bg-[#F2ECE0]'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>관용어 도감</span>
                <span className="text-[11px] bg-[#EBE4D5] text-[#5C5549] px-1.5 py-0.2 rounded-full font-mono">55</span>
              </button>
            </nav>

            <span className="w-[1px] h-6 bg-[#E6DEC9]"></span>

            {/* Audio Toggle */}
            <button
              id="sound-toggle-btn"
              onClick={() => { setAudioEnabled(!audioEnabled); playSound('click'); }}
              className="p-1.5 rounded-full hover:bg-[#F2ECE0] text-[#5C5549] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4D7C66] cursor-pointer"
              title={audioEnabled ? "음소거" : "소리 켜기"}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col justify-start">
        {/* Toast Notifier */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#2D2B2A] text-[#FBF8F3] px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-[#444240] text-sm font-medium"
            >
              <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* 1. HOME SCREEN */}
          {mode === 'home' && (
            <motion.div 
              key="home-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto py-6"
            >
              {/* Left Column: Traditional introduction and start panels */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE3D2] border border-[#D9CEB6] text-xs text-[#5C5343] font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>재미있게 익히는 55가지 단어 조합</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-[#201E1D] leading-tight gowun-batang">
                    말에 감칠맛을 더하는<br />
                    <span className="text-[#4D7C66] underline decoration-wavy decoration-[#C4B9A6] underline-offset-8">한국어 관용어</span> 학습
                  </h2>
                  <p className="text-[#6E6454] max-w-lg leading-relaxed text-sm md:text-base">
                    관용어란 둘 이상의 단어가 결합하여 제3의 완전히 다른 뜻을 나타내는 숙어 표현입니다. 
                    지루하게 암기하는 대신 동적인 퀴즈 프로그램과 예문 도감을 활용해 풍부한 표현력을 가꿔 보세요.
                  </p>
                </div>

                {/* Grid of modes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Practice Start Button */}
                  <div 
                    id="btn-start-practice"
                    onClick={startPracticeMode}
                    className="group relative bg-[#F5EFE6] border-2 border-[#E3D8C3] hover:border-[#4D7C66] rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-11 h-11 rounded-xl bg-[#EBE4D5] group-hover:bg-[#4D7C66] group-hover:text-white transition-colors flex items-center justify-center text-[#5C5549] mb-4">
                        <BookMarked className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-[#2D2B2A] mb-1.5 gowun-batang group-hover:text-[#4D7C66]">자유 연습 모드</h3>
                      <p className="text-xs text-[#7A6E5D] leading-relaxed">
                        모든 관용어(55개)를 시간 제한 없이 차곡차곡 풀어나가며, 뜻과 실생활 활용 예문을 꼼꼼하게 배웁니다.
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-end text-sm font-bold text-[#4D7C66] opacity-80 group-hover:opacity-100 transition-opacity gap-1">
                      <span>연습 구름 타기</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>

                  {/* Challenge Start Button */}
                  <div 
                    id="btn-start-challenge"
                    onClick={startChallengeMode}
                    className="group relative bg-[#EFEBE4] border-2 border-[#E1D7C2] hover:border-[#BF5E5A] rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-11 h-11 rounded-xl bg-[#EBE5D9] group-hover:bg-[#BF5E5A] group-hover:text-white transition-colors flex items-center justify-center text-[#5C5549] mb-4">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-[#2D2B2A] mb-1.5 gowun-batang group-hover:text-[#BF5E5A]">시한 도전 모드</h3>
                      <p className="text-xs text-[#7A6E5D] leading-relaxed">
                        제한 시간 15초, 목숨 3개! 무작위로 추출되는 10문제에 도전해 최고의 관용어 성적을 갱신해 보세요.
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-end text-sm font-bold text-[#BF5E5A] opacity-80 group-hover:opacity-100 transition-opacity gap-1">
                      <span>도전의 문 열기</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>

                {/* Info Tip block */}
                <div className="bg-[#EBE5D7]/50 border border-[#D9CDB2] rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-[#5C5241]">
                  <Info className="w-5 h-5 text-[#8C7A5C] shrink-0" />
                  <div>
                    <span className="font-bold">학습 꿀팁 : </span>
                    퀴즈 중간에 틀리면 관용어가 속해 있는 일상 이야기를 담은 고유 예문을 보여줍니다. 
                    예문 속 문장 구조를 눈여겨보면 일상 실력 향상에 아주 좋습니다!
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Dashboard & Traditional scroll summary */}
              <div className="lg:col-span-5 bg-[#F5EFE6] border-2 border-[#E3D8C3] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm select-none">
                <div className="border-b border-[#E6DEC9] pb-4">
                  <span className="text-[11px] font-bold text-[#8C7B60] uppercase tracking-wider">나의 학습 서첩</span>
                  <h3 className="text-xl font-bold text-[#2E2C2A] mt-1 gowun-batang">학습 등급: <span className="text-[#4D7C66]">{getMasteryRank(masteryPercentage)}</span></h3>
                </div>

                {/* Progress Wheel or Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-[#5C5343]">
                    <span>주요 관용어 암기율</span>
                    <span>{masteryPercentage}% ({learnedCount} / 55개)</span>
                  </div>
                  <div className="w-full h-3 bg-[#EBE4D5] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#4D7C66] to-[#60967D]"
                      initial={{ width: 0 }}
                      animate={{ width: `${masteryPercentage}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    ></motion.div>
                  </div>
                </div>

                {/* Stats list with nice rounded items */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-[#EAE1D1] border border-[#DDD3BC] rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-[#83735B]">연습 모드 풀이</p>
                    <p className="text-lg font-mono font-bold text-[#2D2B2A] mt-1">{stats.timesPracticePlayed}회</p>
                  </div>
                  <div className="bg-[#EAE1D1] border border-[#DDD3BC] rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-[#83735B]">최고 도전 점수</p>
                    <p className="text-lg font-mono font-bold text-amber-800 mt-1">{stats.challengeHighScore}점</p>
                  </div>
                  <div className="bg-[#EAE1D1] border border-[#DDD3BC] rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-[#83735B]">누적 올바른 답</p>
                    <p className="text-lg font-mono font-bold text-[#4D7C66] mt-1">{stats.correctCount}번</p>
                  </div>
                  <div className="bg-[#EAE1D1] border border-[#DDD3BC] rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-[#83735B]">저장한 단어첩</p>
                    <p className="text-lg font-mono font-bold text-[#BF5E5A] mt-1">{bookmarkedCount}개</p>
                  </div>
                </div>

                {/* Button to quickly view Bookmarks list directly */}
                <button
                  id="btn-goto-bookmarked"
                  onClick={() => {
                    handlePlaySound('click');
                    setDictionaryFilter('bookmarked');
                    setMode('dictionary');
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-[#C4B9A6] hover:border-[#4D7C66] text-sm text-[#5C5241] hover:text-[#4D7C66] font-medium bg-[#EFE9DC]/40 hover:bg-[#EAE1CE] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 fill-current text-rose-500" />
                  <span>내가 북마크한 단어만 모아보기</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* 2. PRACTICE MODE / QUIZ SCREEN */}
          {mode === 'quiz_practice' && quizQuestions.length > 0 && (
            <motion.div
              key="practice-quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto w-full py-4 space-y-6"
            >
              {/* Progress and controls */}
              <div className="flex items-center justify-between border-b border-[#E6DEC9] pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-[#4D7C66] text-white px-2.5 py-1 rounded-full font-bold">연습 중</span>
                  <span className="text-sm font-semibold text-[#5C5241]">
                    {currentQuestionIndex + 1} / {quizQuestions.length} 문제
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBookmark(quizQuestions[currentQuestionIndex].idiom.id)}
                    className="p-2 rounded-lg hover:bg-[#F2ECE0] text-[#5C5549] transition-all cursor-pointer"
                    title="이 관용어 북마크"
                  >
                    <Bookmark 
                      className={`w-5 h-5 transition-colors ${
                        stats.bookmarkedIdiomIds.includes(quizQuestions[currentQuestionIndex].idiom.id)
                          ? 'text-rose-500 fill-current'
                          : 'text-[#8C7C66]'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("정말 퀴즈를 중단하고 메인 화면으로 가시겠습니까?")) {
                        handlePlaySound('click');
                        setMode('home');
                      }
                    }}
                    className="p-1 px-3 rounded-lg border border-[#D9CDB8] text-xs text-[#5C5241] hover:bg-[#F2ECE0] transition-colors cursor-pointer"
                  >
                    중단하기
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-[#EBE4D5] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#4D7C66] transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                ></div>
              </div>

              {/* Question card */}
              <div className="bg-[#F5EFE6] border-2 border-[#E3D8C3] rounded-3xl p-6 md:p-8 text-center space-y-6 shadow-sm">
                <span className="text-[11px] font-bold text-[#8C7B60] tracking-widest uppercase">제시된 관용어의 의미를 찾아주세요</span>
                
                <div className="py-4">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#2D2B2A] gowun-batang select-all leading-normal">
                    &ldquo; {quizQuestions[currentQuestionIndex].idiom.phrase} &rdquo;
                  </h2>
                </div>

                {/* 4 multiple choice options */}
                <div className="grid grid-cols-1 gap-3.5 pt-4">
                  {quizQuestions[currentQuestionIndex].options.map((option, index) => {
                    const isSelected = selectedAnswerIndex === index;
                    const isCorrectOption = index === quizQuestions[currentQuestionIndex].correctAnswerIndex;
                    
                    let cardVariantClass = "bg-[#FBF9F4] border-[#E0D5BE] text-[#2E2C2A] hover:bg-[#F2ECE0] hover:border-[#4D7C66]";
                    let statusIcon = null;

                    if (hasAnswered) {
                      if (isCorrectOption) {
                        cardVariantClass = "bg-[#EEF6F2] border-[#2E7D32] text-[#1B5E20] ring-2 ring-[#2E7D32]/20 font-medium";
                        statusIcon = <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0" />;
                      } else if (isSelected) {
                        cardVariantClass = "bg-[#FDF2F2] border-[#C62828] text-[#C62828] ring-2 ring-[#C62828]/20 font-medium";
                        statusIcon = <X className="w-5 h-5 text-[#C62828] shrink-0" />;
                      } else {
                        cardVariantClass = "opacity-50 bg-[#FBF9F4]/70 border-[#E0D5BE] text-[#5C5549]";
                      }
                    }

                    return (
                      <button
                        key={index}
                        id={`option-btn-${index}`}
                        onClick={() => handleAnswerSelection(index)}
                        disabled={hasAnswered}
                        className={`w-full p-4 md:p-5 rounded-xl border-2 text-left text-sm md:text-base transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${cardVariantClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-xs font-mono font-bold text-[#8C7C66] shrink-0">
                            {index + 1}
                          </span>
                          <span className="leading-relaxed select-none">{option}</span>
                        </div>
                        {statusIcon}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slide-up detailed explanation widget */}
              <AnimatePresence>
                {hasAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="bg-white border-2 border-[#E1D1B8] rounded-3xl p-6 shadow-md space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-[#4D7C66] rounded-full animate-ping"></span>
                        <h4 className="text-base font-bold text-[#4D7C66] gowun-batang">디렉터 한지 해설구절</h4>
                      </div>
                      <span className="text-[11px] text-[#A69A85] font-mono">ID: {quizQuestions[currentQuestionIndex].idiom.id}</span>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <p className="text-xs text-[#8C7C66] font-semibold">참 뜻</p>
                        <p className="text-base text-[#2E2C2A] font-medium leading-relaxed mt-0.5">
                          {quizQuestions[currentQuestionIndex].idiom.meaning}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="bg-[#FBF9F4] p-3 rounded-xl border border-[#EDE7D9]">
                          <p className="text-[11px] text-[#8C7C66] font-semibold">직역 / 영어 직역 표현</p>
                          <p className="text-xs font-mono font-medium text-[#5C5549] mt-0.5">
                            {quizQuestions[currentQuestionIndex].idiom.literal}
                          </p>
                        </div>

                        <div className="bg-[#EEF6F2]/70 p-3 rounded-xl border border-[#DCEBE2]">
                          <p className="text-[11px] text-[#4D7C66] font-semibold">학습 여부 정보</p>
                          <p className="text-xs text-[#5C5241] mt-0.5">
                            {stats.learnedIdiomIds.includes(quizQuestions[currentQuestionIndex].idiom.id) 
                              ? '✅ 이 표현을 정답 처리하여 마스터하셨습니다.' 
                              : '⏳ 아직 정답을 완벽히 맞추지 않은 상태입니다.'}
                          </p>
                        </div>
                      </div>

                      {/* Relatable example expression */}
                      <div className="bg-[#F7F5EE] border-l-4 border-[#C4B290] p-4 rounded-r-xl">
                        <p className="text-xs font-bold text-[#8C7449] mb-1">실생활 일상 예문</p>
                        <p className="text-sm text-[#4E4435] leading-relaxed italic gowun-batang">
                          &ldquo; {quizQuestions[currentQuestionIndex].idiom.example} &rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Progress action */}
                    <div className="pt-3 flex justify-end">
                      <button
                        id="btn-next-practice"
                        onClick={handleNextQuestion}
                        className="px-6 py-3 bg-[#4D7C66] hover:bg-[#3D6352] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>
                          {currentQuestionIndex >= quizQuestions.length - 1 ? '퀴즈 결과 보기' : '다음 관용어'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* End of Practice screen */}
              {currentQuestionIndex >= quizQuestions.length - 1 && hasAnswered && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => {
                      handlePlaySound('click');
                      setMode('home');
                    }}
                    className="text-xs text-[#7A6D56] underline cursor-pointer"
                  >
                    중지하고 첫 화면으로 돌아가기
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. CHALLENGE MODE QUIZ SCREEN */}
          {mode === 'quiz_challenge' && quizQuestions.length > 0 && (
            <motion.div
              key="challenge-quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto w-full py-4 space-y-6"
            >
              {/* Top challenge state information */}
              <div className="grid grid-cols-3 items-center border-b border-[#E6DEC9] pb-4 gap-2">
                <div className="text-left">
                  <p className="text-[10px] text-[#A69984] font-bold uppercase">남은 도전자 생명</p>
                  <div className="flex gap-1.5 mt-1">
                    {[1, 2, 3].map((heartVal) => (
                      <Heart 
                        key={heartVal}
                        className={`w-5 h-5 ${
                          heartVal <= lives 
                            ? 'text-[#BF5E5A] fill-current animate-pulse' 
                            : 'text-[#DCE0D5]'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[10px] text-[#A69984] font-bold uppercase">획득한 점수</p>
                  <span className="text-2xl font-mono font-bold text-amber-800 animate-pulse">{score}점</span>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-[#A69984] font-bold uppercase">현재 문항 수</p>
                  <span className="text-sm font-bold text-[#5C5241]">{currentQuestionIndex + 1} / 10 문제</span>
                </div>
              </div>

              {/* Countdown timer bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[#5C5241] flex items-center gap-1">
                    <Timer className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-[#BF5E5A] animate-spin' : ''}`} />
                    <span>풀이 제한 시간</span>
                  </span>
                  <span className={timeLeft <= 5 ? 'text-[#BF5E5A] font-bold' : 'text-[#5C5241]'}>
                    {timeLeft}초 남음
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#EBE4D5] rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${timeLeft <= 5 ? 'bg-[#BF5E5A]' : 'bg-[#D4A373]'}`}
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timeLeft / 15) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  ></motion.div>
                </div>
              </div>

              {/* Problem main statement */}
              <div className="bg-[#F5EFE6] border-2 border-[#E3D8C3] rounded-3xl p-6 md:p-8 text-center space-y-6 shadow-sm relative overflow-hidden">
                <span className="text-xs font-bold text-[#8C7B60] tracking-widest uppercase">제시어</span>
                
                <div className="py-2">
                  <h2 className="text-3xl md:text-5xl font-bold text-[#2D2B2A] gowun-batang leading-tight">
                    &ldquo; {quizQuestions[currentQuestionIndex].idiom.phrase} &rdquo;
                  </h2>
                </div>

                {/* Status indicator watermark */}
                {isTimeOut && (
                  <div className="absolute top-3 right-3 bg-[#BF5E5A] text-[#FBF8F3] px-2.5 py-1 rounded text-xs font-mono font-bold uppercase">
                    시간 초과
                  </div>
                )}

                {/* 4 Options */}
                <div className="grid grid-cols-1 gap-3.5 pt-4">
                  {quizQuestions[currentQuestionIndex].options.map((option, index) => {
                    const isSelected = selectedAnswerIndex === index;
                    const isCorrectOption = index === quizQuestions[currentQuestionIndex].correctAnswerIndex;
                    
                    let cardVariantClass = "bg-[#FBF9F4] border-[#E0D5BE] text-[#2E2C2A] hover:bg-[#F2ECE0] hover:border-[#4D7C66]";
                    let statusIcon = null;

                    if (hasAnswered) {
                      if (isCorrectOption) {
                        cardVariantClass = "bg-[#EEF6F2] border-[#2E7D32] text-[#1B5E20] ring-2 ring-[#2E7D32]/20 font-semibold";
                        statusIcon = <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0" />;
                      } else if (isSelected) {
                        cardVariantClass = "bg-[#FDF2F2] border-[#C62828] text-[#C62828] ring-2 ring-[#C62828]/20 font-semibold";
                        statusIcon = <X className="w-5 h-5 text-[#C62828] shrink-0" />;
                      } else {
                        cardVariantClass = "opacity-50 bg-[#FBF9F4]/70 border-[#E0D5BE] text-[#5C5549]";
                      }
                    }

                    return (
                      <button
                        key={index}
                        id={`challenge-option-btn-${index}`}
                        onClick={() => handleAnswerSelection(index)}
                        disabled={hasAnswered}
                        className={`w-full p-4 md:p-5 rounded-xl border-2 text-left text-sm md:text-base transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${cardVariantClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-xs font-mono font-bold text-[#8C7C66] shrink-0">
                            {index + 1}
                          </span>
                          <span className="leading-relaxed select-none">{option}</span>
                        </div>
                        {statusIcon}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explanatory feedback section (Challenge Mode handles lives checking too) */}
              <AnimatePresence>
                {hasAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="bg-white border-2 border-[#E1D1B8] rounded-3xl p-6 shadow-md space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-2">
                      <div className="flex items-center gap-2">
                        {selectedAnswerIndex === quizQuestions[currentQuestionIndex].correctAnswerIndex ? (
                          <span className="text-sm font-bold text-[#4D7C66]">✓ 정답입니다! (훌륭해요)</span>
                        ) : (
                          <span className="text-sm font-bold text-[#BF5E5A]">✗ 오답이군요 (하트 1 차감됨)</span>
                        )}
                      </div>
                      <span className="text-xs text-[#8C7C66] font-semibold">참 해설</span>
                    </div>

                    <p className="text-sm text-[#2E2C2A] leading-relaxed">
                      💡 정답은 <strong className="text-[#4D7C66]">{quizQuestions[currentQuestionIndex].options[quizQuestions[currentQuestionIndex].correctAnswerIndex]}</strong> 입니다.
                      <br />
                      &quot;{quizQuestions[currentQuestionIndex].idiom.meaning}&quot; 라는 뜻을 가집니다.
                    </p>

                    <div className="bg-[#F7F5EE] border-l-4 border-[#BF5E5A] p-3 rounded-r-xl text-xs text-[#5C5241] italic">
                      예문: &quot;{quizQuestions[currentQuestionIndex].idiom.example}&quot;
                    </div>

                    {/* Progress action buttons */}
                    <div className="pt-2 flex justify-between items-center gap-4">
                      {lives <= 0 && (
                        <span className="text-xs text-[#BF5E5A] font-bold animate-pulse">
                          ⚠️ 남은 목숨이 없습니다. 도전이 곧 중단됩니다.
                        </span>
                      )}
                      
                      <button
                        id="btn-next-challenge"
                        onClick={handleNextQuestion}
                        className={`ml-auto px-6 py-3 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          lives <= 0 ? 'bg-[#BF5E5A] hover:bg-[#8E4441]' : 'bg-[#4D7C66] hover:bg-[#3D6352]'
                        }`}
                      >
                        <span>
                          {lives <= 0 
                            ? '도전 성적 확인하기' 
                            : currentQuestionIndex >= quizQuestions.length - 1 
                              ? '정복 완료! 성적 보기' 
                              : '다음 도전 수'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 4. SUMMARY/HISTORY SCREEN FROM COMPLETED QUIZZES */}
          {((mode === 'quiz_practice' && quizQuestions.length > 0 && currentQuestionIndex >= quizQuestions.length - 1 && hasAnswered === false) ||
            (mode === 'quiz_challenge' && quizQuestions.length > 0 && (lives <= 0 || currentQuestionIndex >= quizQuestions.length - 1) && hasAnswered === false)) && (
            <motion.div
              key="quiz-results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto w-full py-6 space-y-6"
            >
              {/* Badge visual celebration card */}
              <div className="bg-gradient-to-br from-[#EFE8DA] to-[#F5EFE6] border-2 border-[#D9CEB6] rounded-3xl p-8 text-center space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Award className="w-48 h-48 text-[#4D7C66]" />
                </div>

                <div className="w-16 h-16 bg-[#4D7C66] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <Award className="w-9 h-9" />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-[#8C7B60] uppercase tracking-wider">배움의 한 단계를 갈무리하셨습니다</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#201E1D] gowun-batang">
                    {mode === 'quiz_challenge' ? '시한 도전 완료 상소' : '자유 학습 완수 서첩'}
                  </h2>
                </div>

                {/* Score parameters */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-lg mx-auto py-3">
                  <div className="bg-[#FBF9F4] p-3 rounded-2xl border border-[#EDE5D5]">
                    <span className="text-[10px] font-bold text-[#8C7B60]">총 문항 수</span>
                    <p className="text-lg font-mono font-bold text-[#2D2B2A] mt-0.5">{quizHistory.length}문항</p>
                  </div>
                  
                  <div className="bg-[#FBF9F4] p-3 rounded-2xl border border-[#EDE5D5]">
                    <span className="text-[10px] font-bold text-[#8C7B60]">오답 비중</span>
                    <p className="text-lg font-mono font-bold text-[#BF5E5A] mt-0.5">
                      {quizHistory.filter(h => !h.isCorrect).length}개
                    </p>
                  </div>

                  <div className="bg-[#FBF9F4] p-3 rounded-2xl border border-[#EDE5D5] col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-[#8C7B60]">
                      {mode === 'quiz_challenge' ? '최종 득점' : '맞힌 개수'}
                    </span>
                    <p className="text-lg font-mono font-bold text-[#4D7C66] mt-0.5">
                      {mode === 'quiz_challenge' ? `${score}점` : `${quizHistory.filter(h => h.isCorrect).length}개`}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#5C5241] max-w-sm mx-auto leading-relaxed">
                  꾸준한 퀴즈 복습은 우리의 뇌리에 좋은 문학 비법을 안겨다 줍니다. 모은 단어는 아래 도감첩에서 다시 읽고 공부할 수 있습니다.
                </p>

                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <button
                    id="btn-restart-quiz"
                    onClick={mode === 'quiz_challenge' ? startChallengeMode : startPracticeMode}
                    className="px-5 py-3 bg-[#4D7C66] hover:bg-[#3D6352] text-white text-sm font-bold rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>한 번 더 시작하기</span>
                  </button>

                  <button
                    id="btn-end-re-home"
                    onClick={() => { handlePlaySound('click'); setMode('home'); }}
                    className="px-5 py-3 border border-[#C4B9A6] hover:border-[#4D7C66] text-sm text-[#4C4334] font-medium rounded-xl hover:bg-[#F2ECE0] transition-colors cursor-pointer"
                  >
                    첫 화면으로 가기
                  </button>
                </div>
              </div>

              {/* Quiz History Review cards list */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#2D2B2A] gowun-batang flex items-center gap-2 border-b border-[#E6DEC9] pb-2">
                  <HelpCircle className="w-5 h-5 text-[#8C7F6C]" />
                  <span>오늘 답변한 문제 오답노트 (실시간 복습)</span>
                </h3>

                <div className="grid grid-cols-1 gap-3.5">
                  {quizHistory.map((item, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-2xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        item.isCorrect 
                          ? 'bg-[#EEF6F2]/30 border-[#4D7C66]/30' 
                          : 'bg-[#FDF2F2]/30 border-[#BF5E5A]/30'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            item.isCorrect ? 'bg-[#4D7C66] text-white' : 'bg-[#BF5E5A] text-white'
                          }`}>
                            {item.isCorrect ? '✓' : '✗'}
                          </span>
                          <strong className="text-base text-[#2E2C2A] gowun-batang">{item.idiom.phrase}</strong>
                        </div>
                        <p className="text-xs text-[#5C5549]">
                          <strong className="text-slate-800">해설의 뜻 : </strong> {item.idiom.meaning}
                        </p>
                        <p className="text-xs italic text-[#7A6D56] leading-relaxed">
                          &quot;{item.idiom.example}&quot;
                        </p>
                      </div>

                      <div className="text-right shrink-0 bg-white/60 p-2.5 rounded-xl border border-black/5">
                        <p className="text-[10px] text-[#A69984] font-bold">선택하신 답변</p>
                        <p className={`text-xs font-semibold ${item.isCorrect ? 'text-[#4D7C66]' : 'text-[#BF5E5A]'}`}>
                          {item.selectedAnswer}
                        </p>
                        {!item.isCorrect && (
                          <div className="mt-1 border-t border-dotted border-[#E6E0D5] pt-1">
                            <p className="text-[9px] text-[#A69984] font-bold">올바른 참 정답</p>
                            <p className="text-xs text-[#4D7C66] font-semibold">{item.correctAnswer}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 5. STUDY DICTIONARY VIEW */}
          {mode === 'dictionary' && (
            <motion.div
              key="dictionary-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Introduction block */}
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold text-[#2D2B2A] gowun-batang">태고의 숨결을 머금은 관용어 오십오선(55)</h2>
                <p className="text-xs md:text-sm text-[#706555] leading-relaxed">
                  정렬 방식을 활용해 내가 북마크한 단어나 암기 여부를 걸러보고, 돋보기를 눌러 뜻과 해설을 간편 검색하십시오.
                </p>
              </div>

              {/* Search filter controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#F5EFE6] border-2 border-[#E3D8C3] p-4 rounded-2xl shadow-sm">
                
                {/* Text search section */}
                <div className="md:col-span-5 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8C7B65]">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    id="dict-search-input"
                    type="text"
                    placeholder="관용어 단어나 참뜻을 한글로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#FBF9F4] border border-[#C4B9A6] rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4D7C66] placeholder-[#A69C8E]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8C7B65]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter segments buttons */}
                <div className="md:col-span-5 flex rounded-lg p-1 bg-[#EBE4D5] gap-1">
                  {(['all', 'bookmarked', 'learned'] as const).map((filterOpt) => {
                    let label = "전체 단어";
                    let count = IDIOMS_DATA.length;
                    
                    if (filterOpt === 'bookmarked') {
                      label = "북마크";
                      count = stats.bookmarkedIdiomIds.length;
                    } else if (filterOpt === 'learned') {
                      label = "맞힌 단어";
                      count = stats.learnedIdiomIds.length;
                    }

                    return (
                      <button
                        key={filterOpt}
                        onClick={() => { handlePlaySound('click'); setDictionaryFilter(filterOpt); }}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer text-center ${
                          dictionaryFilter === filterOpt 
                            ? 'bg-[#4D7C66] text-white shadow-sm' 
                            : 'text-[#5C5343] hover:bg-[#F2ECE0]'
                        }`}
                      >
                        {label} <span className="font-mono text-[10px] ml-0.5 opacity-85">({count})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="md:col-span-2 text-right">
                  <button
                    onClick={() => {
                      if (confirm("학습 기록(맞힌 문항, 북마크)을 초기화하시겠습니까?")) {
                        handlePlaySound('gameover');
                        setStats(DEFAULT_STATS);
                        localStorage.removeItem(LOCAL_STORAGE_KEY);
                        showToast("학습첩과 북마크가 완전 초기화되었습니다.");
                      }
                    }}
                    className="text-xs text-[#BF5E5A] hover:bg-[#FBECEB] rounded px-2.5 py-1.5 transition-colors border border-[#BF5E5A]/20 cursor-pointer w-full md:w-auto text-center block"
                  >
                    기록 초기화
                  </button>
                </div>
              </div>

              {/* Grid lists of idioms cards */}
              {filteredIdioms.length === 0 ? (
                <div className="bg-[#F5EFE6] border-2 border-dashed border-[#E3D8C3] rounded-3xl p-12 text-center text-[#706555] space-y-2">
                  <p className="text-base font-semibold gowun-batang">조건에 들어맞는 관용어가 존재하지 않습니다.</p>
                  <p className="text-xs text-[#A69B88]">다른 검색란 키워드를 넣거나, 북마크 탭 설정을 해제하여 보십시오.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredIdioms.map((idiom) => {
                    const isBookmarked = stats.bookmarkedIdiomIds.includes(idiom.id);
                    const isLearned = stats.learnedIdiomIds.includes(idiom.id);
                    
                    return (
                      <div 
                        key={idiom.id}
                        className="bg-[#F5EFE6] hover:bg-white border-2 border-[#E3D8C3] hover:border-[#4D7C66] rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md"
                      >
                        <div>
                          {/* Card top banner badge */}
                          <div className="flex justify-between items-start border-b border-[#EBE4D5] pb-2 mb-3">
                            <span className="text-[11px] font-mono font-bold bg-[#EBE4D5] text-[#5C5343] px-1.5 py-0.5 rounded">
                              No. {idiom.id}
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              {isLearned && (
                                <span className="text-[10px] bg-[#EEF6F2] border border-[#2E7D32]/20 text-[#2E7D32] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                  <span>마스터</span>
                                </span>
                              )}
                              
                              <button
                                onClick={() => toggleBookmark(idiom.id)}
                                className="p-1 rounded-full text-[#A69B88] hover:text-[#BF5E5A] hover:bg-[#F1ECE3] transition-colors cursor-pointer"
                              >
                                <Bookmark 
                                  className={`w-4.5 h-4.5 ${
                                    isBookmarked ? 'text-rose-500 fill-current' : 'text-[#8C7B65]'
                                  }`} 
                                />
                              </button>
                            </div>
                          </div>

                          {/* Phrasing info */}
                          <h4 className="text-lg font-bold text-[#2D2B2A] gowun-batang select-all mb-1.5">
                            {idiom.phrase}
                          </h4>

                          <p className="text-xs text-[#2E2C2A] font-medium leading-relaxed mb-3">
                            {idiom.meaning}
                          </p>

                          <div className="bg-[#FBF9F4] border border-[#EDE5D5] p-2 rounded-xl text-xs space-y-1 mb-3">
                            <span className="text-[9px] font-bold text-[#8C7B60] block font-mono">LITERAL EN</span>
                            <p className="font-mono text-[10px] leading-relaxed text-[#6E6351] select-all block">
                              {idiom.literal}
                            </p>
                          </div>
                        </div>

                        {/* Expandable and test shortcut action trigger */}
                        <div className="border-t border-[#EBE4D5] pt-3 flex items-center justify-between gap-2 mt-4">
                          <button
                            onClick={() => setSelectedDictIdiom(idiom)}
                            className="bg-[#EBE4D5] hover:bg-[#4D7C66] text-[#5C5343] hover:text-white text-[11px] font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>상세 예문 보기</span>
                          </button>

                          <button
                            onClick={() => startSingleIdiomPractice(idiom)}
                            className="bg-[#EEF6F2] hover:bg-[#2D6049] text-[#2E7D32] hover:text-white border border-[#2E7D32]/25 font-bold text-[11px] px-3 py-1.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                            title="이 단어로만 퀴즈 풀기"
                          >
                            <span>퀴즈 테스트</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal Dialog for detailed Idiom example */}
      <AnimatePresence>
        {selectedDictIdiom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDictIdiom(null)}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            ></motion.div>

            {/* Modal Body card */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#FBF9F4] border-2 border-[#E1D1B8] rounded-3xl p-6 shadow-xl space-y-4 text-left z-10"
            >
              <button
                onClick={() => setSelectedDictIdiom(null)}
                className="absolute top-4 right-4 p-1 rounded-full text-[#8C7B65] hover:bg-[#F1ECE3] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex gap-1.5 items-center">
                <span className="text-xs bg-[#4D7C66] text-white px-2.5 py-0.5 rounded-full font-bold">
                  단어 상세
                </span>
                <span className="text-xs text-[#8C7F6E] font-mono">No. {selectedDictIdiom.id}</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-tight text-[#222] gowun-batang select-all pb-1">
                  {selectedDictIdiom.phrase}
                </h3>
                <div className="h-[2px] bg-gradient-to-r from-[#4D7C66] to-transparent w-2/3"></div>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <h4 className="text-[11px] font-bold text-[#8D7F6D] uppercase tracking-wider">사전식 뜻</h4>
                  <p className="text-sm text-[#2E2C2A] leading-relaxed mt-0.5 font-medium">
                    {selectedDictIdiom.meaning}
                  </p>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-[#8D7F6D] uppercase tracking-wider">말의 기원 / 영문 대응</h4>
                  <p className="text-xs font-mono text-[#5C5549] bg-[#EBE4D5]/35 p-2 rounded-lg border border-black/5 mt-0.5 select-all">
                    {selectedDictIdiom.literal}
                  </p>
                </div>

                <div className="bg-[#F7F5EE] border-l-4 border-[#C4B290] p-4 rounded-r-xl">
                  <h4 className="text-[11px] font-bold text-[#8D7554] tracking-wider mb-1">실생활 일상 예문</h4>
                  <p className="text-xs text-[#4E4435] leading-relaxed italic font-medium gowun-batang select-all">
                    &ldquo; {selectedDictIdiom.example} &rdquo;
                  </p>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#EBE4D5]">
                <button
                  onClick={() => {
                    const idiom = selectedDictIdiom;
                    setSelectedDictIdiom(null);
                    startSingleIdiomPractice(idiom);
                  }}
                  className="px-4 py-2 bg-[#4D7C66] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#3E6553] transition-colors cursor-pointer"
                >
                  이 단어 퀴즈 풀기
                </button>
                <button
                  onClick={() => setSelectedDictIdiom(null)}
                  className="px-4 py-2 border border-[#C4B9A6] text-xs font-medium text-[#5C5241] rounded-lg hover:bg-[#F2ECE0] transition-colors cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled Footer */}
      <footer className="bg-[#F5EFE6] border-t border-[#E3D8C3] py-6 px-4 md:px-8 mt-12 text-center text-xs text-[#8C7E6C] select-none">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="leading-relaxed">
            © 2026 <strong>관용어 도감 퀴즈</strong> (Korean Idiom Reader Portfolio).
            한국어 국어 어휘와 고등 표현력 향상을 위한 서첩.
          </p>
          <div className="flex gap-4">
            <span className="hover:text-[#4D7C66] cursor-pointer" onClick={() => { handlePlaySound('click'); setMode('dictionary'); }}>도감 보기</span>
            <span className="hover:text-[#4D7C66] cursor-pointer" onClick={() => { handlePlaySound('click'); setMode('home'); }}>처음 화면</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
