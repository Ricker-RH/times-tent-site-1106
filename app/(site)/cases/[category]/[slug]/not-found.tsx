import Link from "next/link";

export default function CaseNotFound() {
  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">未找到案例</h1>
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
          您访问的案例暂不可用，请返回案例列表或联系我们获取更多资料。
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/cases" className="inline-flex items-center rounded-[6px] bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-white">
            返回案例展示
          </Link>
          <Link href="/contact" className="inline-flex items-center rounded-[6px] border border-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-primary)]">
            联系顾问
          </Link>
        </div>
      </div>
    </div>
  );
}
