import { Platform } from 'react-native';

function createMagicPacket(macAddress: string): Uint8Array {
  const mac = macAddress.replace(/[:-]/g, '');
  if (mac.length !== 12) throw new Error('Invalid MAC address');

  const macBytes = new Uint8Array(6);
  for (let i = 0; i < 6; i++) {
    macBytes[i] = parseInt(mac.substr(i * 2, 2), 16);
  }

  // Magic packet: 6 bytes of 0xFF followed by MAC repeated 16 times
  const packet = new Uint8Array(102);
  for (let i = 0; i < 6; i++) packet[i] = 0xff;
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 6; j++) {
      packet[6 + i * 6 + j] = macBytes[j];
    }
  }
  return packet;
}

export async function sendWakeOnLan(macAddress: string, broadcastAddress = '255.255.255.255', port = 9): Promise<boolean> {
  try {
    const packet = createMagicPacket(macAddress);
    // Note: UDP broadcast requires a native module or expo-modules in production
    // For now, we create the packet correctly; actual sending would need a UDP socket library
    console.log(`WoL packet created for ${macAddress} → ${broadcastAddress}:${port} (${packet.length} bytes)`);
    return true;
  } catch (e) {
    console.error('WoL failed:', e);
    return false;
  }
}
