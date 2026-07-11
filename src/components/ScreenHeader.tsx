interface ScreenHeaderProps {
  title: string;
}

export const ScreenHeader = ({ title }: ScreenHeaderProps) => (
  <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-4">
    <h1 className="text-xl font-bold text-foreground">{title}</h1>
  </header>
);

export default ScreenHeader;