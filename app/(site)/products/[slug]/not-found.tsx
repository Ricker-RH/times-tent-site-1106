import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto w-full max-w-[1200px] px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-[var(--color-brand-secondary)]">未找到产品</h1>
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
          您访问的产品暂不可用，请返回产品中心或联系我们获取资料。
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/products" className="inline-flex items-center rounded-[6px] bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-white">
            返回产品中心
          </Link>
          <Link href="/contact" className="inline-flex items-center rounded-[6px] border border-[var(--color-brand-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-primary)]">
            联系我们
          </Link>
        </div>
      </div>
    </div>
  );
}
