'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/api';
import { verifyLabourOtp } from '@/lib/api/purchase';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

const SESSION_KEY = 'labour-otp-verified';

const LabourOtpGate = ({ children }: { children: React.ReactNode }) => {
  const [verified, setVerified] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1'
  );
  const [code, setCode] = useState('');

  const { mutate: verify, isPending, error } = useMutation({
    mutationFn: verifyLabourOtp,
    onSuccess: () => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setVerified(true);
    },
  });

  if (verified) return <>{children}</>;

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Enter OTP Code</DialogTitle>
          <DialogDescription>
            The Labour Cost page is protected. Enter the 6-digit OTP code to continue.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(code);
          }}
          className="flex flex-col gap-3"
        >
          <Input
            autoFocus
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-lg tracking-widest"
          />
          {error && (
            <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
          )}
          <Button type="submit" disabled={code.length !== 6 || isPending}>
            {isPending ? 'Verifying...' : 'Unlock Page'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LabourOtpGate;
