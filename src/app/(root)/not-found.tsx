import { redirect } from "next/navigation";

export default function NotFound() {
  return redirect("/"); // redirect to home page
}
