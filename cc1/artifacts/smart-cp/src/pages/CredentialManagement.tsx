import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CredentialManagement() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credential Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            User IDs and passwords are managed by the backend authentication system.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 px-3 py-1.5">
          <ShieldCheck size={14} /> Admin Access
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound size={16} /> Secure Credential Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Passwords are never created, stored, or reset in browser localStorage.</p>
            <p>Initial administrator access is created with `ADMIN_USERNAME` and `ADMIN_PASSWORD` through the backend bootstrap script.</p>
            <p>All passwords must satisfy the strong password policy and are hashed before storage.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus size={16} /> User Provisioning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Create employee, intern, HR, and manager login records through backend user-management APIs or the secure database bootstrap process.</p>
            <p>The frontend only authenticates through `/api/auth/login` and never exposes password hashes or temporary credentials.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
