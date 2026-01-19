import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  password: z.string().min(3, "Password is required"),
});

interface LinkPasswordProps {
  password: string | null;
  setPassword: (password: string | null) => void;
  handlePasswordSave?: (password: string | null) => void;
  disabled?: boolean;
  isFreePlan?: boolean;
}

export default function LinkPassword({
  password,
  setPassword,
  handlePasswordSave,
  disabled = false,
  isFreePlan = false,
}: LinkPasswordProps) {
  const {
    register,
    setValue,
    reset,
    getValues,
    formState: { errors },
    trigger,
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { password: password || "" },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [open, setOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setValue("password", password || "");
  }, [password, setValue]);

  const onSave = async () => {
    const valid = await trigger("password");
    if (!valid) {
      setLocalError(
        (errors.password?.message as string) || "Password is required",
      );
      return;
    }
    const pwd = getValues("password");
    setPassword(pwd);
    if (handlePasswordSave) handlePasswordSave(pwd);
    setOpen(false);
    setLocalError(null);
  };

  const handleRemovePassword = () => {
    setPassword(null);
    reset({ password: "" });
    if (handlePasswordSave) handlePasswordSave(null);
    setOpen(false);
    setLocalError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            "text-xs",
            disabled && "cursor-not-allowed opacity-60",
          )}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
        >
          <Lock
            className={cn(
              "p-[1px] font-medium",
              password && !disabled && "text-blue-500",
            )}
            size={8}
          />
          Password
        </Button>
      </DialogTrigger>
      <DialogContent className=" sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-medium">Link Password</DialogTitle>
        </DialogHeader>
        <div className="mt-3 space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              {...register("password")}
              className="w-full pr-10"
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {(errors.password || localError) && (
            <p className="text-xs text-red-500">
              {(errors.password?.message as string) || localError}
            </p>
          )}
          <DialogFooter className="flex w-full items-center sm:justify-between">
            <button
              type="button"
              className="cursor-pointer text-xs"
              onClick={handleRemovePassword}
            >
              Remove password
            </button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={onSave} disabled={isFreePlan}>
                {isFreePlan && (
                  <Lock className="mr-1 h-3 w-3" />
                )}
                Save
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
