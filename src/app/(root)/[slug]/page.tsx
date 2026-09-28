"use client";
import React from "react";
import { useParams } from "next/navigation";
import PasswordGateForm from "@/components/web/_links/password-gate-form";
import NotFound from "../not-found";

const SlugPassword = () => {
  const params = useParams();
  const slug = params.slug as string;

  if (slug === "not-found") {
    return <NotFound />;
  }

  return <PasswordGateForm slug={slug} />;
};

export default SlugPassword;
