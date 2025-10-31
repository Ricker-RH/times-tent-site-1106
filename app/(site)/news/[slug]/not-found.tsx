import Link from "next/link";

export default function NewsNotFound() {
  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">未找到新闻</h1>
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
          您访问的新闻暂不可用，请返回新闻中心或联系我们获取更多更新。
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/news" className="inline-flex items-center rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-white">
            返回新闻中心
          </Link>
          <Link href="/contact" className="inline-flex items-center rounded-full border border-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-primary)]">
            联系我们
          </Link>
        </div>
      </div>
    </div>
  );
}
