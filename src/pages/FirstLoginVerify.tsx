import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/store/AuthStore";

const FirstLoginVerify = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { verifyFirstLogin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setFailed(true);
        setIsVerifying(false);
        return;
      }

      const user = await verifyFirstLogin(token);
      if (!user) {
        setFailed(true);
        setIsVerifying(false);
        return;
      }

      toast({
        title: "Verification successful",
        description: "Now set your new password to continue.",
      });
      navigate("/change-password", { replace: true });
    };

    run();
  }, [token, verifyFirstLogin, toast, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>First Login Verification</CardTitle>
          <CardDescription>
            {isVerifying
              ? "Verifying your login link..."
              : failed
              ? "Verification failed or link expired."
              : "Verification complete."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failed && (
            <Button onClick={() => navigate("/login")} className="w-full">
              Back to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FirstLoginVerify;
