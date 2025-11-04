/* LABELED_BY_TOOL
 * File: src/components/Footer.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

export const Footer = () => {
  return (
    <footer className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            <p>Financial Due Diligence Agent v1.0.0</p>
            <p className="mt-1">
              Built with React, TypeScript, and Tailwind CSS
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-sm text-muted-foreground">
            <p>© 2024 FDD Agent. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};