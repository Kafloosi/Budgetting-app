import React, { useMemo } from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { type as faces } from '../theme';

/**
 * Every piece of text in the app, so the bundled register is the default
 * rather than something each style has to remember.
 *
 * It also resolves weight to a face. Android has no Archivo to interpolate:
 * asked for `fontWeight: '700'` against a family that only carries regular,
 * it synthesises a slanted, smeared fake bold. Picking the actual 700 file
 * is the difference between a bundled font looking better than the system
 * one and looking worse. Call sites keep writing `fontWeight` — it is the
 * readable thing to write — and this maps it to the file.
 *
 * An explicit `fontFamily` always wins, which is how the typewriter register
 * (serials, stamps, receipts) opts out.
 */
function faceFor(weight: TextStyle['fontWeight']): string {
  switch (weight) {
    case 'bold':
    case '700':
    case '800':
    case '900':
      return faces.registerBold;
    case '600':
      return faces.registerSemi;
    case '500':
      return faces.registerMedium;
    default:
      return faces.register;
  }
}

export function Text({ style, ...props }: TextProps) {
  const resolved = useMemo(() => {
    const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
    if (flat.fontFamily) {
      // A face was named outright. Clear the weight so Android does not
      // embolden a file that is already the weight it was asked for.
      return { fontFamily: flat.fontFamily, fontWeight: undefined } as TextStyle;
    }
    return { fontFamily: faceFor(flat.fontWeight), fontWeight: undefined } as TextStyle;
  }, [style]);

  return <RNText {...props} style={[style, resolved]} />;
}
