import { signInWithGitHub, signInWithGoogle } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Sign in · taro",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.8h5.35c-.23 1.4-1.62 4.1-5.35 4.1a5.9 5.9 0 0 1 0-11.8c1.7 0 2.84.73 3.5 1.36l2.38-2.3A9.3 9.3 0 0 0 12 2.6 9.4 9.4 0 1 0 12 21.4c5.42 0 9-3.8 9-9.16 0-.62-.07-1.1-.15-1.14Z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2A10 10 0 0 0 8.84 21.5c.5.08.66-.22.66-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.16.57.67.48A10 10 0 0 0 12 2Z"
      />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  const google = signInWithGoogle.bind(null, next);
  const github = signInWithGitHub.bind(null, next);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-lg font-semibold">t</span>
          </div>
          <CardTitle className="text-2xl">taro</CardTitle>
          <CardDescription>
            A knowledge platform for analytics engineering. Sign in to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Sign-in failed. Please try again.
            </p>
          ) : null}
          <form action={google}>
            <Button type="submit" variant="outline" className="w-full gap-2">
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>
          <form action={github}>
            <Button type="submit" variant="outline" className="w-full gap-2">
              <GithubIcon />
              Continue with GitHub
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-center text-xs text-muted-foreground">
            Access is gated. The first user to sign in becomes the owner; others
            join as viewers.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
