import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";

interface UnsavedChangesDialogProps {
  open: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const UnsavedChangesDialog = ({ open, onDiscard, onSave, onCancel }: UnsavedChangesDialogProps) => {
  const { t } = useI18n();
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("unsaved.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("unsaved.desc")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Close</AlertDialogCancel>
          <AlertDialogCancel onClick={onDiscard}>{t("unsaved.discard")}</AlertDialogCancel>
          <AlertDialogAction onClick={onSave}>{t("unsaved.save")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsavedChangesDialog;
