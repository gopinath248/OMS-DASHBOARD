import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { useLocation } from "wouter";
import { useState } from "react";

export function Topbar() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center md:hidden font-bold text-lg tracking-tight text-primary">
        <div className="size-6 rounded bg-primary flex items-center justify-center text-primary-foreground mr-2 text-xs">
          D
        </div>
        DMS
      </div>
      
      <div className="flex-1 flex justify-end">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search projects, documents..." 
            className="w-full pl-9 bg-muted/50 border-transparent focus-visible:bg-background h-9 rounded-full text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>
    </header>
  );
}
