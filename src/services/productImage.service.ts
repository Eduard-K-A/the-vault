import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { generateUUID } from '@/utils/generateUUID';

const IMAGE_DIR = 'product-images';

export type ImageSource = 'library' | 'camera';

function persistAsset(uri: string): string {
  const dir = new Directory(Paths.document, IMAGE_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }

  const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const destination = new File(dir, `${generateUUID()}.${extension}`);
  const source = new File(uri);
  source.copy(destination);
  return destination.uri;
}

/**
 * Removes a previously persisted product image. Safe to call with any uri –
 * only files inside the managed product-image directory are deleted.
 */
export function removePersistedImage(uri: string | null | undefined): void {
  if (!uri || !uri.includes(`/${IMAGE_DIR}/`)) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup; ignore missing files.
  }
}

/**
 * Launches the gallery or camera, copies the chosen image into app storage,
 * and returns the persisted file uri (or null if the user cancelled).
 * Throws when the required permission is denied.
 */
export async function pickProductImage(source: ImageSource): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera permission is required to take a photo.');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    return persistAsset(result.assets[0].uri);
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to choose an image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return persistAsset(result.assets[0].uri);
}
