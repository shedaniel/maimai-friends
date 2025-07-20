"use client";

import { Button } from "@/components/ui/button";
import { Database, LogOut } from "lucide-react";
import Image from "next/image";

interface User {
  name?: string | null;
  image?: string | null;
}

interface UserHeaderProps {
  user: User;
  onLogout: () => void;
}

export function UserHeader({ user, onLogout }: UserHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-3">
        <Database className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">Maimai Charts</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {user.image && (
          <Image 
            src={user.image} 
            alt="Profile"
            width={40}
            height={40}
            className="w-10 h-10 rounded-full"
          />
        )}
        <Button variant="outline" onClick={onLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
} 