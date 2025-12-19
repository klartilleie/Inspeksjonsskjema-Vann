import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, LogIn, User, Lock, UserPlus } from "lucide-react";
import logoUrl from "@assets/Lars_Logo-01_1765460766343.jpg";

const loginSchema = z.object({
  username: z.string().min(1, "Brukernavn er påkrevd"),
  password: z.string().min(1, "Passord er påkrevd"),
});

const setupSchema = z.object({
  username: z.string().min(3, "Brukernavn må være minst 3 tegn"),
  password: z.string().min(6, "Passord må være minst 6 tegn"),
  fullName: z.string().min(1, "Fullt navn er påkrevd"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SetupFormData = z.infer<typeof setupSchema>;

export default function Login() {
  const { toast } = useToast();
  const { login, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch("/api/app/setup-status");
        const data = await response.json();
        setNeedsSetup(data.needsSetup);
      } catch (error) {
        setNeedsSetup(false);
      }
    };
    checkSetup();
  }, []);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const setupForm = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
    },
  });

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.username, data.password);
      toast({
        title: "Logget inn",
        description: "Velkommen!",
      });
    } catch (error) {
      toast({
        title: "Innlogging feilet",
        description: "Ugyldig brukernavn eller passord",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSetup = async (data: SetupFormData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/app/setup", data);
      toast({
        title: "Admin opprettet",
        description: "Du er nå logget inn som administrator.",
      });
      await refreshUser();
    } catch (error) {
      toast({
        title: "Oppsett feilet",
        description: "Kunne ikke opprette admin-bruker",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (needsSetup === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={logoUrl} alt="Klar til Leie AS" className="h-40 w-auto object-contain" />
            </div>
            <CardTitle className="text-xl">Første gangs oppsett</CardTitle>
            <p className="text-sm text-muted-foreground">
              Opprett en administrator-konto for å komme i gang
            </p>
          </CardHeader>
          <CardContent>
            <Form {...setupForm}>
              <form onSubmit={setupForm.handleSubmit(onSetup)} className="space-y-4">
                <FormField
                  control={setupForm.control}
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
                          data-testid="input-setup-fullname"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={setupForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Brukernavn
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin"
                          data-testid="input-setup-username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={setupForm.control}
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
                          data-testid="input-setup-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-setup"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Opprett administrator
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logoUrl} alt="Klar til Leie AS" className="h-40 w-auto object-contain" />
          </div>
          <CardTitle className="text-xl">Logg inn</CardTitle>
          <p className="text-sm text-muted-foreground">
            Befaringsskjema: Lett Avløps-/Gråvannsystem
          </p>
        </CardHeader>
        <CardContent>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Brukernavn
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Skriv inn brukernavn"
                        data-testid="input-username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
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
                        placeholder="Skriv inn passord"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Logg inn
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
