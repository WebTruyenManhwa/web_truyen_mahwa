"use client";

import React from 'react';
import { CommentProvider } from "../../../../../contexts/CommentContext";

export default function ChapterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommentProvider>{children}</CommentProvider>;
}