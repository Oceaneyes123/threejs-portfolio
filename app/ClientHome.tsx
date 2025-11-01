"use client";
import NameScene from "./scene/NameScene";

export default function ClientHome({ name }: { name?: string }) {
  return (
    <main>
      <NameScene name={name} />
      <div className="pointer-events-none select-none absolute bottom-8 right-8 z-10 text-white/90 drop-shadow">
        <p className="text-right leading-tight">
          <span className="block text-xs opacity-80">Use your</span>
          <span className="block text-xl font-extrabold tracking-widest">W A S D</span>
          <span className="block text-xs opacity-80">or drag to look around</span>
        </p>
      </div>
    </main>
  );
}
