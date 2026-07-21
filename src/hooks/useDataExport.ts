import { open as dialogOpen, save as dialogSave } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useCallback, useState } from 'react';
import { exportWorkspaceData, importWorkspaceData } from '../services/database';

export function useDataExport() {
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importPendingJson, setImportPendingJson] = useState<string | null>(null);

  const handleExportData = useCallback(async () => {
    try {
      const json = await exportWorkspaceData();
      const path = await dialogSave({
        title: 'Export Workspace Data',
        defaultPath: 'taxon-workspace.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (path) {
        await writeTextFile(path, json);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  const handleImportDataTrigger = useCallback(async () => {
    try {
      const selected = await dialogOpen({
        title: 'Import Workspace Data',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        const json = await readTextFile(selected);
        setImportPendingJson(json);
        setIsImportConfirmOpen(true);
      }
    } catch (err) {
      console.error('Import failed:', err);
    }
  }, []);

  const confirmImport = useCallback(async () => {
    if (!importPendingJson) return;
    try {
      await importWorkspaceData(importPendingJson);
      setIsImportConfirmOpen(false);
      setImportPendingJson(null);
      window.location.reload();
    } catch (err) {
      console.error('Import confirmation failed:', err);
    }
  }, [importPendingJson]);

  return {
    handleExportData,
    handleImportDataTrigger,
    confirmImport,
    isImportConfirmOpen,
    setIsImportConfirmOpen,
    setImportPendingJson,
  };
}
