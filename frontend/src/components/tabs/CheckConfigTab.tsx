/**
 * CheckConfigTab Component
 * 
 * Contains check configuration parameters
 * - TCP, HTTP, Latency, Bandwidth settings
 */

import CheckConfigPanel from '../CheckConfigPanel';
import type { TabContentProps } from './types';

export default function CheckConfigTab({ 
  onSuccess, 
  onError, 
  onSuccessMessage,
  savedData,
  onDataChange,
  onMarkChanged
}: TabContentProps) {
  return (
    <div>
      <CheckConfigPanel 
        onSuccess={onSuccess}
        onError={onError}
        onSuccessMessage={onSuccessMessage}
        savedData={savedData as any}
        onDataChange={onDataChange}
        onMarkChanged={onMarkChanged}
      />
    </div>
  );
}
