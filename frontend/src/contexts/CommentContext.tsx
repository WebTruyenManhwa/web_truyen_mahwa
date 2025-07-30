"use client";

import React, { createContext, useContext, useReducer, useCallback } from 'react';

interface User {
  id: number;
  username: string;
  avatar?: string;
}

interface Comment {
  id: number;
  content: string;
  sticker?: string;
  stickers?: string[];
  createdAt?: string;
  created_at?: string;
  has_replies?: boolean;
  replies?: Comment[];
  user?: User;
  user_id?: number;
  parent_id?: number;
  commentable_type?: string;
  commentable_id?: number;
  updated_at?: string;
}

interface CommentState {
  comments: Comment[];
}

type CommentAction =
  | { type: 'SET_COMMENTS'; payload: Comment[] }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'ADD_REPLY'; parentId: number; payload: Comment }
  | { type: 'RESET' };

interface CommentContextType {
  state: CommentState;
  setComments: (comments: Comment[]) => void;
  addComment: (comment: Comment) => void;
  addReply: (parentId: number, reply: Comment) => void;
  reset: () => void;
}

const initialState: CommentState = {
  comments: [],
};

const commentReducer = (state: CommentState, action: CommentAction): CommentState => {
  switch (action.type) {
    case 'SET_COMMENTS':
      return { ...state, comments: action.payload };
    case 'ADD_COMMENT':
      // Kiểm tra nếu comment đã tồn tại (tránh duplicate khi nhận từ socket)
      if (state.comments.some(comment => comment.id === action.payload.id)) {
        return state;
      }
      return { ...state, comments: [action.payload, ...state.comments] };
    case 'ADD_REPLY':
      return {
        ...state,
        comments: state.comments.map(comment =>
          comment.id === action.parentId
            ? {
                ...comment,
                has_replies: true,
                replies: [
                  ...(comment.replies || []),
                  // Kiểm tra nếu reply đã tồn tại
                  ...(comment.replies?.some(reply => reply.id === action.payload.id)
                    ? []
                    : [action.payload]),
                ],
              }
            : comment
        ),
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

const CommentContext = createContext<CommentContextType | undefined>(undefined);

export const CommentProvider: React.FC<{
  children: React.ReactNode;
  initialComments?: Comment[];
}> = ({ children, initialComments = [] }) => {
  const [state, dispatch] = useReducer(commentReducer, {
    ...initialState,
    comments: initialComments,
  });

  const setComments = useCallback((comments: Comment[]) => {
    dispatch({ type: 'SET_COMMENTS', payload: comments });
  }, []);

  const addComment = useCallback((comment: Comment) => {
    dispatch({ type: 'ADD_COMMENT', payload: comment });
  }, []);

  const addReply = useCallback((parentId: number, reply: Comment) => {
    dispatch({ type: 'ADD_REPLY', parentId, payload: reply });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <CommentContext.Provider
      value={{
        state,
        setComments,
        addComment,
        addReply,
        reset,
      }}
    >
      {children}
    </CommentContext.Provider>
  );
};

export const useCommentContext = () => {
  const context = useContext(CommentContext);
  if (context === undefined) {
    throw new Error('useCommentContext must be used within a CommentProvider');
  }
  return context;
};
