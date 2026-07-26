import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Transaction } from '../types';

/**
 * Owns the receipt-photo files under documentDirectory/receipts/.
 * The invariant "files on disk == photoUris referenced by transactions" is
 * enforced by reconcileReceipts, which runs on every app start — so photo
 * replacements, abandoned forms, bulk deletions, and backup imports all
 * self-heal without every call site needing its own cleanup.
 */
const RECEIPTS_DIR = () => `${FileSystem.documentDirectory}receipts/`;

/** Open the camera or photo library and persist the result. Null when cancelled/denied. */
export async function pickReceiptPhoto(fromCamera: boolean): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { quality: 0.5 };
  let result: ImagePicker.ImagePickerResult;
  if (fromCamera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets?.[0]) return null;

  // Copy into app storage so the photo survives cache cleanup
  const tempUri = result.assets[0].uri;
  const dir = RECEIPTS_DIR();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const ext = tempUri.split('.').pop()?.slice(0, 5) || 'jpg';
  const dest = `${dir}${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

/** Delete every stored receipt file that no transaction references anymore. */
export async function reconcileReceipts(transactions: Transaction[]): Promise<void> {
  try {
    const dir = RECEIPTS_DIR();
    const files = await FileSystem.readDirectoryAsync(dir).catch(() => [] as string[]);
    if (files.length === 0) return;
    const referenced = new Set(
      transactions
        .map((t) => t.photoUri)
        .filter((uri): uri is string => !!uri)
        .map((uri) => uri.split('/').pop()),
    );
    await Promise.all(
      files
        .filter((name) => !referenced.has(name))
        .map((name) =>
          FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }).catch(() => {}),
        ),
    );
  } catch {
    // Cleanup is best-effort.
  }
}
