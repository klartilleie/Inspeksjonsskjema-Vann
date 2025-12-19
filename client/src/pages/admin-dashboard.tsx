import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Inspection } from "@shared/schema";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Trash2, Eye, LogOut, FileText, Image, Users, UserPlus, User, Lock, Loader2 } from "lucide-react";
import logoUrl from "@assets/Lars_Logo-01_1765460766343.jpg";

interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  createdAt: string;
}

const createUserSchema = z.object({
  username: z.string().min(3, "Brukernavn må være minst 3 tegn"),
  password: z.string().min(6, "Passord må være minst 6 tegn"),
  fullName: z.string().min(1, "Fullt navn er påkrevd"),
  role: z.enum(["user", "admin"]),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: inspections, isLoading: inspectionsLoading } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
  });

  const { data: appUsers, isLoading: usersLoading } = useQuery<AppUser[]>({
    queryKey: ["/api/app/users"],
  });

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "user",
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/inspections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      toast({
        title: "Slettet",
        description: "Befaringsskjemaet ble slettet.",
      });
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke slette skjemaet.",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      await apiRequest("POST", "/api/app/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/users"] });
      toast({
        title: "Bruker opprettet",
        description: "Den nye brukeren ble opprettet.",
      });
      form.reset();
      setDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke opprette brukeren. Brukernavnet kan være i bruk.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/app/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app/users"] });
      toast({
        title: "Bruker slettet",
        description: "Brukeren ble slettet.",
      });
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke slette brukeren.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await logout();
  };

  const onSubmitUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Klar til Leie AS" className="h-10 w-auto object-contain" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground" data-testid="text-admin-user">
              {user?.fullName}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              data-testid="button-admin-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logg ut
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="inspections" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inspections" data-testid="tab-inspections">
              <FileText className="h-4 w-4 mr-2" />
              Befaringsskjemaer
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Brukere
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspections" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Befaringsskjemaer</h2>
              <Badge variant="secondary">{inspections?.length || 0} skjemaer</Badge>
            </div>

            {inspectionsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : inspections?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Ingen befaringsskjemaer funnet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inspections?.map((inspection) => (
                  <Card key={inspection.id} data-testid={`card-inspection-${inspection.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{inspection.customerName}</CardTitle>
                        <Badge variant="outline" className="shrink-0">
                          <Image className="h-3 w-3 mr-1" />
                          {inspection.imageCount}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{inspection.customerAddress}</p>
                        <p>{inspection.customerEmail}</p>
                        <p>{inspection.customerPhone}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Utfylt av: {inspection.reportFilledBy}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {inspection.createdAt && format(new Date(inspection.createdAt), "d. MMMM yyyy, HH:mm", { locale: nb })}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(`/skjema/${inspection.id}`, "_blank")}
                          data-testid={`button-view-${inspection.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Se detaljer
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteMutation.mutate(inspection.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${inspection.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Brukere</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-user">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Legg til bruker
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Opprett ny bruker</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitUser)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Fullt navn
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ola Nordmann"
                                data-testid="input-new-fullname"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Brukernavn
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="brukernavn"
                                data-testid="input-new-username"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Lock className="w-4 h-4" />
                              Passord
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Minst 6 tegn"
                                data-testid="input-new-password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rolle</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-new-role">
                                  <SelectValue placeholder="Velg rolle" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="user">Bruker</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createUserMutation.isPending}
                        data-testid="button-create-user"
                      >
                        {createUserMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-2" />
                        )}
                        Opprett bruker
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {usersLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : appUsers?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Ingen brukere funnet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {appUsers?.map((appUser) => (
                  <Card key={appUser.id} data-testid={`card-user-${appUser.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{appUser.fullName}</CardTitle>
                        <Badge variant={appUser.role === "admin" ? "default" : "secondary"}>
                          {appUser.role === "admin" ? "Admin" : "Bruker"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        Brukernavn: {appUser.username}
                      </div>
                      {appUser.createdAt && (
                        <div className="text-xs text-muted-foreground">
                          Opprettet: {format(new Date(appUser.createdAt), "d. MMMM yyyy", { locale: nb })}
                        </div>
                      )}
                      {appUser.id !== user?.id && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => deleteUserMutation.mutate(appUser.id)}
                            disabled={deleteUserMutation.isPending}
                            data-testid={`button-delete-user-${appUser.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Slett
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
