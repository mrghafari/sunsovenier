import React from 'react';
import { Activity, Package, Radio, Truck } from 'lucide-react';

type Props = {
  title: string;
  activeOrdersLabel: string;
  newOrdersLabel: string;
  activeOrders: number;
  newOrders: number;
  eyebrow: string;
  description: string;
  online: string;
};

export default function LogisticsWorkspaceHeader({
  title,
  activeOrdersLabel,
  newOrdersLabel,
  activeOrders,
  newOrders,
  eyebrow,
  description,
  online,
}: Props) {
  return (
    <header className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-[#cddbd6] bg-[#f4f8f5] px-5 py-6 shadow-[0_18px_45px_-30px_rgba(22,55,49,0.55)] md:px-8 md:py-7">
      <div className="pointer-events-none absolute -end-12 -top-16 h-44 w-44 rounded-full bg-[#d6e8df] opacity-70" />
      <div className="pointer-events-none absolute bottom-0 start-1/3 h-20 w-56 -translate-y-2 rounded-full bg-[#f5dfbd] opacity-50 blur-3xl" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#55756c]">
            <Radio className="h-4 w-4" />
            <span>{eyebrow}</span>
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-[#183d36] md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#5d746e]">{description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="min-w-[132px] rounded-2xl border border-[#d9e5e0] bg-white/80 px-4 py-3">
            <div className="flex items-center gap-2 text-[#6b817b]"><Package className="h-4 w-4" /><span className="text-xs">{activeOrdersLabel}</span></div>
            <strong className="mt-1 block text-2xl text-[#183d36]">{activeOrders}</strong>
          </div>
          <div className="min-w-[132px] rounded-2xl border border-[#ead8bd] bg-[#fffaf1] px-4 py-3">
            <div className="flex items-center gap-2 text-[#9a6a32]"><Activity className="h-4 w-4" /><span className="text-xs">{newOrdersLabel}</span></div>
            <strong className="mt-1 block text-2xl text-[#8b5c2c]">{newOrders}</strong>
          </div>
        </div>
      </div>
      <div className="relative mt-5 flex items-center gap-2 text-xs text-[#668079]">
        <Truck className="h-4 w-4 text-[#b27a38]" />
        <span>{online}</span>
        <span className="ms-auto h-2 w-2 rounded-full bg-[#4d9b78] shadow-[0_0_0_4px_#d9eee3]" />
      </div>
    </header>
  );
}