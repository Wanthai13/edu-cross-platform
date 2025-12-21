// utils/transcriptEvents.ts
// Simple event emitter for transcript updates

type Listener = () => void;

class TranscriptEventEmitter {
  private listeners: Set<Listener> = new Set();

  /**
   * Subscribe to transcript updates
   * @returns Unsubscribe function
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit transcript updated event
   */
  emit(): void {
    console.log('📢 Transcript updated event emitted to', this.listeners.size, 'listeners');
    if (this.listeners.size === 0) {
      console.warn('⚠️ No listeners subscribed to transcript events!');
    }
    this.listeners.forEach((listener, index) => {
      try {
        console.log(`📢 Calling listener ${index + 1}/${this.listeners.size}`);
        listener();
      } catch (error) {
        console.error(`Error in transcript event listener ${index + 1}:`, error);
      }
    });
  }

  /**
   * Emit event with delay to ensure DB is updated
   */
  emitDelayed(delayMs: number = 1000): void {
    console.log(`📢 Scheduling transcript event emission in ${delayMs}ms`);
    setTimeout(() => {
      this.emit();
    }, delayMs);
  }

  /**
   * Get number of active listeners
   */
  get listenerCount(): number {
    return this.listeners.size;
  }
}

// Singleton instance
export const transcriptEvents = new TranscriptEventEmitter();

