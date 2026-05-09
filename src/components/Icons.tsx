// Phosphor Icons — weight: light — for Lexicon
// Re-exports with consistent naming

import {
  House,
  MagnifyingGlass,
  BookmarkSimple,
  Gear,
  Trash,
  ArrowLeft,
  ArrowRight,
  ShareNetwork,
  CheckCircle,
  X,
  Plus,
  CaretLeft,
  File,
  ToggleLeft,
  ToggleRight,
  Clock,
  Shuffle,
  Sun,
  Moon,
  Drop,
  PencilSimple,
  DotsThreeVertical,
  UploadSimple,
  DownloadSimple,
  Check,
} from '@phosphor-icons/react';
type Props = { className?: string; size?: number };

const W = 'light' as const;

export const HouseIcon = ({ className, size = 24 }: Props) => (
  <House weight={W} size={size} className={className} />
);

export const SearchIcon = ({ className, size = 24 }: Props) => (
  <MagnifyingGlass weight={W} size={size} className={className} />
);

export const BookmarkIcon = ({ className, size = 24, filled = false }: Props & { filled?: boolean }) => (
  <BookmarkSimple weight={filled ? 'fill' : W} size={size} className={className} />
);

export const GearIcon = ({ className, size = 24 }: Props) => (
  <Gear weight={W} size={size} className={className} />
);

export const TrashIcon = ({ className, size = 24 }: Props) => (
  <Trash weight={W} size={size} className={className} />
);

export const ShuffleIcon = ({ className, size = 24 }: Props) => (
  <Shuffle weight={W} size={size} className={className} />
);

export const ArrowLeftIcon = ({ className, size = 24 }: Props) => (
  <ArrowLeft weight={W} size={size} className={className} />
);

export const ArrowRightIcon = ({ className, size = 24 }: Props) => (
  <ArrowRight weight={W} size={size} className={className} />
);

export const ShareIcon = ({ className, size = 24 }: Props) => (
  <ShareNetwork weight={W} size={size} className={className} />
);

export const CheckCircleIcon = ({ className, size = 24 }: Props) => (
  <CheckCircle weight={W} size={size} className={className} />
);

export const XIcon = ({ className, size = 24 }: Props) => (
  <X weight={W} size={size} className={className} />
);

export const PlusIcon = ({ className, size = 24 }: Props) => (
  <Plus weight={W} size={size} className={className} />
);

export const ChevronLeftIcon = ({ className, size = 24 }: Props) => (
  <CaretLeft weight={W} size={size} className={className} />
);

export const FileIcon = ({ className, size = 24 }: Props) => (
  <File weight={W} size={size} className={className} />
);

export const ToggleOnIcon = ({ className, size = 24 }: Props) => (
  <ToggleRight weight="fill" size={size} className={className} />
);

export const ToggleOffIcon = ({ className, size = 24 }: Props) => (
  <ToggleLeft weight={W} size={size} className={className} />
);

export const ClockIcon = ({ className, size = 24 }: Props) => (
  <Clock weight={W} size={size} className={className} />
);

export const SunIcon = ({ className, size = 24 }: Props) => (
  <Sun weight={W} size={size} className={className} />
);

export const MoonIcon = ({ className, size = 24 }: Props) => (
  <Moon weight={W} size={size} className={className} />
);

export const DropIcon = ({ className, size = 24 }: Props) => (
  <Drop weight={W} size={size} className={className} />
);

export const PencilIcon = ({ className, size = 24, filled = false }: Props & { filled?: boolean }) => (
  <PencilSimple weight={filled ? 'fill' : W} size={size} className={className} />
);

export const DotsThreeIcon = ({ className, size = 24 }: Props) => (
  <DotsThreeVertical weight={W} size={size} className={className} />
);

export const UploadIcon = ({ className, size = 24 }: Props) => (
  <UploadSimple weight={W} size={size} className={className} />
);

export const DownloadIcon = ({ className, size = 24 }: Props) => (
  <DownloadSimple weight={W} size={size} className={className} />
);

export const CheckIcon = ({ className, size = 24 }: Props) => (
  <Check weight={W} size={size} className={className} />
);
