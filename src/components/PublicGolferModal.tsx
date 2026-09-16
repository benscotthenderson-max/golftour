import React from 'react';
import { GolferUser, GolfPost, Tournament } from '../types/golf';
import { FriendProfileModal } from './FriendProfileModal';

interface PublicGolferModalProps {
  targetUser: GolferUser | null;
  currentUser: GolferUser;
  isOpen: boolean;
  onClose: () => void;
  isFriend: boolean;
  isPendingSent: boolean;
  isPendingReceived: boolean;
  pendingRequestId?: string;
  isFollowed: boolean;
  onSendFriendRequest: (targetUserId: string) => void;
  onAcceptFriendRequest?: (requestId: string, requesterId: string) => void;
  onDeclineFriendRequest?: (requestId: string) => void;
  onToggleFollow: (targetUserId: string) => void;
  userPosts?: GolfPost[];
  tournament?: Tournament | null;
}

export const PublicGolferModal: React.FC<PublicGolferModalProps> = ({
  targetUser,
  currentUser,
  isOpen,
  onClose,
  isFriend,
  isPendingSent,
  isPendingReceived,
  pendingRequestId,
  isFollowed,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onToggleFollow,
  userPosts = [],
  tournament = null,
}) => {
  return (
    <FriendProfileModal
      friend={targetUser}
      currentUser={currentUser}
      isOpen={isOpen}
      onClose={onClose}
      posts={userPosts}
      tournament={tournament}
      isFriend={isFriend}
      isPendingSent={isPendingSent}
      isPendingReceived={isPendingReceived}
      isFollowed={isFollowed}
      onSendFriendRequest={onSendFriendRequest}
      onAcceptFriendRequest={onAcceptFriendRequest}
      onToggleFollow={onToggleFollow}
      pendingRequestId={pendingRequestId}
    />
  );
};

