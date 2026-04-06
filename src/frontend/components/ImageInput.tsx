import { useRef } from 'react';

interface Props {
  onImageSelect: (image: File) => void;
  disabled: boolean;
}

export function ImageInput({ onImageSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = () => {
    const file = inputRef.current?.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <div>
      <label>
        画像を選択:
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          disabled={disabled}
          style={{ marginLeft: 8 }}
        />
      </label>
    </div>
  );
}
