import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import {
  useGetUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useActivateUser,
  useDeactivateUser,
} from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { UserProfile } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, UserCheck, UserX, ShieldCheck, Shield } from "lucide-react";
import { format } from "date-fns";

// ── Schema ────────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  username: z.string().min(3, "Minimum 3 characters").max(50),
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Minimum 8 characters"),
  isSuperAdmin: z.boolean(),
});

const editUserSchema = z.object({
  username: z.string().min(3, "Minimum 3 characters").max(50),
  email: z.string().email("Must be a valid email"),
  password: z.string().optional(),
  isSuperAdmin: z.boolean(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleBadge(roles: string[]) {
  const isSuperAdmin = roles.includes("ROLE_SUPER_ADMIN");
  return isSuperAdmin ? (
    <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
      <ShieldCheck className="h-3 w-3" /> Super Admin
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <Shield className="h-3 w-3" /> Admin
    </Badge>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createUser = useCreateUser();

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema) as Resolver<CreateUserForm>,
    defaultValues: { username: "", email: "", password: "", isSuperAdmin: false },
  });

  const onSubmit = (values: CreateUserForm) => {
    const roles = values.isSuperAdmin
      ? ["ROLE_SUPER_ADMIN", "ROLE_ADMIN"]
      : ["ROLE_ADMIN"];

    createUser.mutate(
      { username: values.username, email: values.email, password: values.password, roles },
      {
        onSuccess: () => {
          toast({ title: "User created successfully." });
          form.reset();
          setOpen(false);
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : "Failed to create user.";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-user">
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl><Input {...field} autoComplete="off" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} autoComplete="off" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" {...field} autoComplete="new-password" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="isSuperAdmin" render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <input
                    type="checkbox"
                    id="isSuperAdmin-create"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                  <div>
                    <label htmlFor="isSuperAdmin-create" className="text-sm font-medium cursor-pointer">
                      Grant Super Admin access
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Can manage users, view reports, configure settings
                    </p>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating…" : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────

function EditUserModal({ user }: { user: UserProfile }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const updateUser = useUpdateUser();

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema) as Resolver<EditUserForm>,
    defaultValues: {
      username: user.username,
      email: user.email,
      password: "",
      isSuperAdmin: user.roles.includes("ROLE_SUPER_ADMIN"),
    },
  });

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      form.reset({
        username: user.username,
        email: user.email,
        password: "",
        isSuperAdmin: user.roles.includes("ROLE_SUPER_ADMIN"),
      });
    }
  };

  const onSubmit = (values: EditUserForm) => {
    const roles = values.isSuperAdmin
      ? ["ROLE_SUPER_ADMIN", "ROLE_ADMIN"]
      : ["ROLE_ADMIN"];

    const payload: Record<string, unknown> = {
      username: values.username,
      email: values.email,
      roles,
    };
    // Only include password if the user typed one
    if (values.password && values.password.trim() !== "") {
      payload.password = values.password;
    } else {
      // Backend requires password field — send existing hash placeholder.
      // The backend only updates password if value is non-blank.
      payload.password = "";
    }

    updateUser.mutate(
      { id: user.id, data: payload as never },
      {
        onSuccess: () => {
          toast({ title: "User updated." });
          setOpen(false);
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : "Failed to update user.";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-edit-user-${user.id}`}>
          <Edit className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit User — {user.username}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl><Input {...field} autoComplete="off" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span></FormLabel>
                <FormControl><Input type="password" {...field} autoComplete="new-password" placeholder="••••••••" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="isSuperAdmin" render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <input
                    type="checkbox"
                    id={`isSuperAdmin-edit-${user.id}`}
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                  <div>
                    <label htmlFor={`isSuperAdmin-edit-${user.id}`} className="text-sm font-medium cursor-pointer">
                      Super Admin access
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Can manage users, view reports, configure settings
                    </p>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { currentUser, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const { data: users, isLoading } = useGetUsers();
  const deleteUser = useDeleteUser();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();

  const handleDelete = (user: UserProfile) => {
    deleteUser.mutate(user.id, {
      onSuccess: () => toast({ title: `${user.username} deleted.` }),
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "Delete failed.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    });
  };

  const handleToggleActive = (user: UserProfile) => {
    const fn = user.enabled ? deactivateUser : activateUser;
    fn.mutate(user.id, {
      onSuccess: () =>
        toast({ title: `${user.username} ${user.enabled ? "deactivated" : "activated"}.` }),
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "Action failed.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system accounts and permissions.</p>
        </div>
        <CreateUserModal />
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j} className={j === 0 ? "pl-6" : j === 5 ? "pr-6" : ""}>
                        <Skeleton className="h-5 w-full max-w-[120px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users && users.length > 0 ? (
                users.map((user) => {
                  const isCurrentUser = user.username === currentUser?.username;
                  return (
                    <TableRow
                      key={user.id}
                      className={`hover:bg-muted/10 transition-colors ${!user.enabled ? "opacity-60" : ""}`}
                      data-testid={`row-user-${user.id}`}
                    >
                      <TableCell className="pl-6 font-medium">
                        {user.username}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{roleBadge(user.roles)}</TableCell>
                      <TableCell>
                        {user.enabled ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-1">
                          <EditUserModal user={user} />

                          {/* Activate / Deactivate — hidden for current user */}
                          {!isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(user)}
                              title={user.enabled ? "Deactivate" : "Activate"}
                              data-testid={`button-toggle-user-${user.id}`}
                            >
                              {user.enabled ? (
                                <UserX className="h-4 w-4 text-amber-500" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                          )}

                          {/* Delete — SUPER_ADMIN only, hidden for current user */}
                          {isSuperAdmin && !isCurrentUser && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  data-testid={`button-delete-user-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {user.username}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This permanently removes the account. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(user)}
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
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}