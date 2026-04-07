import { ThemeSwitcher } from "./ThemeSwitcher";
import { WeatherIndicator } from "./WeatherIndicator";

export function Header() {
  return (
    <header className="bg-bg-header shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="/" className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <h1 className="text-xl font-bold text-text-on-primary">
            Kayla&apos;s Garden
          </h1>
        </a>
        <nav className="flex items-center gap-4">
          <a
            href="/"
            className="text-sm font-medium text-text-on-primary/80 hover:text-text-on-primary transition-colors"
          >
            My Plants
          </a>
          <a
            href="/library"
            className="text-sm font-medium text-text-on-primary/80 hover:text-text-on-primary transition-colors"
          >
            Plant Library
          </a>
          <a
            href="/settings"
            className="text-sm font-medium text-text-on-primary/80 hover:text-text-on-primary transition-colors"
          >
            Settings
          </a>
          <div className="ml-2 border-l border-white/20 pl-3">
            <WeatherIndicator />
          </div>
          <div className="border-l border-white/20 pl-3">
            <ThemeSwitcher />
          </div>
        </nav>
      </div>
    </header>
  );
}
