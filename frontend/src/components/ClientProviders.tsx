"use client";

import React from "react";
import { AuthProvider } from "../hooks/useAuth";
import { ThemeProvider } from "../hooks/useTheme";
import { ActionCableProvider } from "../contexts/ActionCableContext";
import { CommentProvider } from "../contexts/CommentContext";
import { ApolloProvider } from "@apollo/client";
import client from "../services/graphqlClient";
import Header from "./Header";
import Footer from "./Footer";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ApolloProvider client={client}>
          <ActionCableProvider>
            <CommentProvider>
              <Header />
              <main className="flex-grow container mx-auto px-4 py-6">
                {children}
              </main>
              <Footer />
            </CommentProvider>
          </ActionCableProvider>
        </ApolloProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
