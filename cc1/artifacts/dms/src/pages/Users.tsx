import { useState } from "react";
import {
  useDmsListUsers,
  getDmsListUsersQueryKey,
  useDmsCreateUser,
  useDmsUpdateUser,
  useDmsDeleteUser,
  DmsUserUpdateRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users as UsersIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Role = "admin" | "staff";

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: Role;
}

function CreateUserForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: UserFormState) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<UserFormState>({ name: "", email: "", password: "", role: "staff" });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="u-name">Full Name</Label>
        <Input
          id="u-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Jane Doe"
          data-testid="input-user-name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-email">Email</Label>
        <Input
          id="u-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="jane@codecore.com"
          data-testid="input-user-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-password">Password</Label>
        <Input
          id="u-password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder="Min. 6 characters"
          data-testid="input-user-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-role">Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}>
          <SelectTrigger id="u-role" data-testid="select-user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={() => onSubmit(form)}
        disabled={isPending || !form.name.trim() || !form.email.trim() || !form.password}
        className="w-full"
        data-testid="button-submit-user"
      >
        {isPending ? "Creating..." : "Create User"}
      </Button>
    </div>
  );
}

function EditUserForm({
  initial,
  onSubmit,
  isPending,
}: {
  initial: { name: string; email: string; role: Role };
  onSubmit: (data: { name?: string; email?: string; role?: DmsUserUpdateRole }) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState(initial);
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="eu-name">Full Name</Label>
        <Input
          id="eu-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          data-testid="input-edit-user-name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="eu-email">Email</Label>
        <Input
          id="eu-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          data-testid="input-edit-user-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="eu-role">Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}>
          <SelectTrigger id="eu-role" data-testid="select-edit-user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={() => onSubmit(form)}
        disabled={isPending || !form.name.trim() || !form.email.trim()}
        className="w-full"
        data-testid="button-submit-edit-user"
      >
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<{ id: number; name: string; email: string; role: Role } | null>(null);

  const { data: users, isLoading } = useDmsListUsers({
    query: { queryKey: getDmsListUsersQueryKey() },
  });

  const createMutation = useDmsCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDmsListUsersQueryKey() });
        setCreateOpen(false);
        toast({ title: "User created" });
      },
      onError: () => toast({ title: "Failed to create user", variant: "destructive" }),
    },
  });

  const updateMutation = useDmsUpdateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDmsListUsersQueryKey() });
        setEditUser(null);
        toast({ title: "User updated" });
      },
      onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
    },
  });

  const deleteMutation = useDmsDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDmsListUsersQueryKey() });
        toast({ title: "User deleted" });
      },
      onError: () => toast({ title: "Failed to delete user", variant: "destructive" }),
    },
  });

  if (currentUser?.role !== "admin") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Access restricted to administrators.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">Manage portal access and roles.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <Plus className="size-4 mr-2" /> New User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
              </DialogHeader>
              <CreateUserForm
                isPending={createMutation.isPending}
                onSubmit={(data) => createMutation.mutate({ data })}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
              </div>
            ) : !users?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
                <UsersIcon className="size-10 mb-3 opacity-30" />
                <p className="text-sm">No users found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role === "admin" ? "default" : "secondary"}
                          className="capitalize"
                          data-testid={`badge-role-${u.id}`}
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => setEditUser({ id: u.id, name: u.name, email: u.email, role: u.role as Role })}
                            data-testid={`button-edit-user-${u.id}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          {u.id !== currentUser?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive hover:text-destructive"
                                  data-testid={`button-delete-user-${u.id}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{u.name}" from the system.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate({ id: u.id })}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <EditUserForm
              initial={editUser}
              isPending={updateMutation.isPending}
              onSubmit={(data) => updateMutation.mutate({ id: editUser.id, data })}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
