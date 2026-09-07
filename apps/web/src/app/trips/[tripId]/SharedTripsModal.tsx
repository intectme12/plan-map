"use client";

import { Modal } from "@/components/Modal";
import { SharedTripBrowser } from "@/app/trips/SharedTripBrowser";

export function SharedTripsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} title="다른 사람 여행계획" scrollable>
      <SharedTripBrowser />
    </Modal>
  );
}
