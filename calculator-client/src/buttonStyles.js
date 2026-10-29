const baseClasses =
  "flex aspect-square w-full touch-manipulation items-center justify-center rounded-full text-[clamp(1.8rem,9vw,2.75rem)] leading-none font-normal transition-[background-color,color,transform] duration-150 select-none hover:cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ffb37f] active:scale-95";

const themeVariants = {
  dark: {
    number: "bg-[#374151] text-white hover:bg-[#465266]",
    utility: "bg-[#737f8f] text-white hover:bg-[#8490a0]",
    operator: "bg-[#ff6500] text-white hover:bg-[#ff7a20]",
  },
  light: {
    number: "bg-[#e5e7eb] text-[#111827] hover:bg-[#d1d5db]",
    utility: "bg-[#cbd5e1] text-[#111827] hover:bg-[#b9c5d3]",
    operator: "bg-[#ff6500] text-white hover:bg-[#e85d00]",
  },
};

export function getButtonClasses(variant = "number", theme = "dark") {
  const variants = themeVariants[theme] ?? themeVariants.dark;
  return `${baseClasses} ${variants[variant] ?? variants.number}`;
}
