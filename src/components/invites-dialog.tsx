"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Copy, X, Users, AlertTriangle, Clock, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc-client";

const SIGNUP_TYPE = process.env.NEXT_PUBLIC_ACCOUNT_SIGNUP_TYPE || 'disabled';

interface Invite {
  id: string;
  code: string;
  createdAt: Date;
  claimedAt: Date | null;
  claimedBy: string | null;
  claimedByName: string | null;
  expiresAt: Date;
  revoked: boolean;
}

interface InviteQuota {
  used: number;
  total: number;
  canCreateNew: boolean;
  activeCount: number;
  recentlyClaimedCount: number;
}

interface InviteData {
  invites: Invite[];
  quota: InviteQuota;
}

interface InvitesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InvitesDialog({ isOpen, onClose }: InvitesDialogProps) {
  // Only show dialog if invite system is enabled
  if (SIGNUP_TYPE !== 'invite-only') {
    return null;
  }

  // tRPC hooks
  const { 
    data: inviteData, 
    isLoading, 
    refetch: refetchInvites 
  } = trpc.user.getInvites.useQuery(undefined, {
    enabled: isOpen, // Only fetch when dialog is open
    refetchOnWindowFocus: false,
  });

  const createInviteMutation = trpc.user.createInvite.useMutation({
    onSuccess: async (data) => {
      toast.success('Invitation created successfully!');
      
      // Copy invite URL to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.inviteUrl);
        toast.success('Invitation link copied to clipboard!');
      }
      
      // Refresh invites list
      refetchInvites();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create invitation');
    },
  });

  const revokeInviteMutation = trpc.user.revokeInvite.useMutation({
    onSuccess: () => {
      toast.success('Invitation revoked successfully!');
      refetchInvites();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to revoke invitation');
    },
  });

  const createInvite = async () => {
    createInviteMutation.mutate();
  };

  const revokeInvite = async (inviteId: string) => {
    revokeInviteMutation.mutate({ inviteId });
  };

  const copyInviteLink = async (code: string) => {
    const inviteUrl = `${window.location.origin}/accept/${code}`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success('Invitation link copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy to clipboard');
      }
    } else {
      toast.error('Clipboard not supported');
    }
  };

  const getInviteStatus = (invite: Invite) => {
    if (invite.revoked) return 'revoked';
    if (invite.claimedBy) return 'claimed';
    if (new Date(invite.expiresAt) <= new Date()) return 'expired';
    return 'active';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="w-4 h-4 rounded-full border-2 border-blue-500" />;
      case 'claimed':
        return <div className="w-4 h-4 rounded-full bg-green-500" />;
      case 'expired':
        return <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400" />;
      case 'revoked':
        return <div className="w-4 h-4 rounded-full bg-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400" />;
    }
  };

  const getStatusText = (status: string, invite: Invite) => {
    switch (status) {
      case 'active':
        return `Active until ${format(new Date(invite.expiresAt), 'MMM dd, yyyy')}`;
      case 'claimed':
        return `Claimed by ${invite.claimedByName || 'Unknown'} on ${invite.claimedAt ? format(new Date(invite.claimedAt), 'MMM dd, yyyy') : 'Unknown'}`;
      case 'expired':
        return `Expired on ${format(new Date(invite.expiresAt), 'MMM dd, yyyy')}`;
      case 'revoked':
        return 'Revoked';
      default:
        return 'Unknown status';
    }
  };

  const renderQuotaCircles = () => {
    if (!inviteData) return null;
    
    const circles = [];
    for (let i = 0; i < inviteData.quota.total; i++) {
      if (i < inviteData.quota.activeCount) {
        // Active invite
        circles.push(
          <div key={i} className="w-4 h-4 rounded-full border-2 border-blue-500" title="Active invitation" />
        );
      } else if (i < inviteData.quota.used) {
        // Recently claimed
        circles.push(
          <div key={i} className="w-4 h-4 rounded-full bg-green-500" title="Recently claimed invitation" />
        );
      } else {
        // Available slot
        circles.push(
          <div key={i} className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400" title="Available slot" />
        );
      }
    }
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Quota:</span>
        <div className="flex space-x-1">{circles}</div>
        <span className="text-sm text-muted-foreground">
          {inviteData.quota.used}/{inviteData.quota.total}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Invitations
          </DialogTitle>
          <DialogDescription>
            Create and manage invitation links for new users.<br />
            You can create invite 3 users per 3 days. Invitations link expire after 7 days. <br />
            Only invite people you trust or personally know, you may be responsible for their actions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quota Display */}
          {inviteData && (
            <div className="space-y-3">
              {renderQuotaCircles()}
              <div className="text-xs text-muted-foreground">
                • Dashed circle = Available slot<br />
                • Normal border = Active invitation<br />
                • Filled circle = Recently claimed
              </div>
            </div>
          )}

          {/* Create New Invite */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Your Invitations</h3>
            <Button
              onClick={createInvite}
              disabled={createInviteMutation.isPending || !inviteData?.quota.canCreateNew}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createInviteMutation.isPending ? 'Creating...' : 'Create Invite'}
            </Button>
          </div>

          {/* Invites List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              <span className="ml-2">Loading invitations...</span>
            </div>
          ) : inviteData?.invites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invitations created yet.
            </div>
          ) : (
            <div className="space-y-3">
              {inviteData?.invites.map((invite) => {
                const status = getInviteStatus(invite);
                return (
                  <Card key={invite.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(status)}
                        <div>
                          <div className="text-sm font-medium">
                            {status === 'active' ? 'Active Code' : 
                             status === 'claimed' ? 'Claimed Code' : 
                             status === 'expired' ? 'Expired Code' : 'Revoked Code'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getStatusText(status, invite)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyInviteLink(invite.code)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Link
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeInvite(invite.id)}
                              disabled={revokeInviteMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              {revokeInviteMutation.isPending ? 'Revoking...' : 'Revoke'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 