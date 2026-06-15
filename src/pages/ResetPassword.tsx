import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";

type TokenStatus = "checking" | "valid" | "invalid" | "missing";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(token ? "checking" : "missing");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!token) {
      setTokenStatus("missing");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await authApi.validateResetToken(token);
        if (!cancelled) {
          setTokenStatus(result.valid ? "valid" : "invalid");
        }
      } catch {
        if (!cancelled) {
          setTokenStatus("invalid");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tokenStatus !== "valid") {
      toast({
        title: "Invalid link",
        description: "This reset link is missing, expired, or already used.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 8) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: "Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast({ title: "Password reset", description: "You can now sign in with your new password." });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Invalid or expired reset link.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const invalidMessage =
    tokenStatus === "missing"
      ? "Reset token is missing from this link."
      : "This reset link has expired or was already used. Request a new one from the login page.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Set a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {tokenStatus === "checking" ? (
            <p className="text-sm text-muted-foreground text-center py-6">Checking reset link…</p>
          ) : tokenStatus !== "valid" ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive">{invalidMessage}</p>
              <Button asChild className="w-full">
                <Link to="/forgot-password">Request a new reset link</Link>
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/login" className="underline">
                  Back to login
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/login" className="underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
