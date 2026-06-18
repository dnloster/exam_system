import Link from "next/link";

const cards = [
  {
    href: "/documents",
    title: "Tài liệu, Bài giảng",
    icon: "📚",
    gradient: "from-rose-500/10 to-orange-500/10",
    illustration: (
      <div className="flex items-end justify-center gap-1.5">
        <div className="h-16 w-8 rounded-lg bg-gradient-to-t from-rose-500 to-rose-400 shadow-sm" />
        <div className="h-20 w-8 rounded-lg bg-gradient-to-t from-blue-500 to-blue-400 shadow-sm" />
        <div className="h-14 w-8 rounded-lg bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm" />
        <div className="mb-4 text-4xl">🎓</div>
      </div>
    ),
  },
  {
    href: "/classrooms",
    title: "Lớp học",
    icon: "🏫",
    gradient: "from-emerald-500/10 to-teal-500/10",
    illustration: (
      <div className="text-center">
        <div className="text-5xl">👨‍🏫</div>
        <div className="mt-3 flex justify-center gap-2 text-2xl opacity-80">
          <span>💻</span>
          <span>💻</span>
          <span>💻</span>
        </div>
      </div>
    ),
  },
  {
    href: "/quizzes",
    title: "Ôn tập và Kiểm tra",
    icon: "📋",
    gradient: "from-blue-500/10 to-indigo-500/10",
    illustration: (
      <div className="flex items-center justify-center gap-1.5">
        {["Q", "U", "i", "Z"].map((letter, i) => (
          <div
            key={letter}
            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-md ${
              [
                "bg-gradient-to-br from-orange-500 to-amber-500",
                "bg-gradient-to-br from-blue-500 to-indigo-500",
                "bg-gradient-to-br from-slate-600 to-slate-700",
                "bg-gradient-to-br from-emerald-500 to-green-600",
              ][i]
            }`}
          >
            {letter}
          </div>
        ))}
      </div>
    ),
  },
];

export default function FeatureCards() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-8 md:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="group card card-padded transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div
            className={`mb-5 flex min-h-[150px] items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient}`}
          >
            {card.illustration}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-portal-primary">
            <span className="text-lg">{card.icon}</span>
            {card.title}
          </div>
        </Link>
      ))}
    </section>
  );
}
