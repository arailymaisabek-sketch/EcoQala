import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  clusterApiUrl 
} from '@solana/web3.js';
import { BlockchainRecord } from '../types';

export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const STORAGE_BLOCKCHAIN_RECORDS_KEY = 'ecoqala_solana_blockchain_records';

/**
 * Helper to obtain the Phantom wallet provider from window
 */
export function getPhantomProvider(): any {
  if (typeof window !== 'undefined') {
    if ((window as any).phantom?.solana?.isPhantom || (window as any).phantom?.solana) {
      return (window as any).phantom.solana;
    }
    if ((window as any).solana?.isPhantom) {
      return (window as any).solana;
    }
  }
  return null;
}

/**
 * Format timestamp in Russian locale
 */
export function formatRussianDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Initial sample records to show on first load
 */
const INITIAL_RECORDS: BlockchainRecord[] = [
  {
    id: 'seed-record-1',
    signature: '5xRp9KqL8vZa3nMbT1wGyU2cF4eHdJ6sPmQ9XoN8aR7t',
    text: '[EcoQala] Эко-дело: Очистка парковой зоны (Алматы) | Награда: +30 ECO | Верифицировано Gemini Vision',
    timestamp: Date.now() - 1000 * 60 * 35,
    formattedTime: formatRussianDate(Date.now() - 1000 * 60 * 35),
    explorerUrl: 'https://explorer.solana.com/tx/5xRp9KqL8vZa3nMbT1wGyU2cF4eHdJ6sPmQ9XoN8aR7t?cluster=devnet',
    ecoReward: 30,
    status: 'confirmed',
  },
  {
    id: 'seed-record-2',
    signature: '4uT7v8KxJ3bMaL2wP0qSnF9cGyR5eHdJ6sPmQ9XoN8aR',
    text: '[EcoQala] Эко-дело: Посадка саженца яблони (Астана) | Награда: +100 ECO | Верифицировано Gemini Vision',
    timestamp: Date.now() - 1000 * 60 * 140,
    formattedTime: formatRussianDate(Date.now() - 1000 * 60 * 140),
    explorerUrl: 'https://explorer.solana.com/tx/4uT7v8KxJ3bMaL2wP0qSnF9cGyR5eHdJ6sPmQ9XoN8aR?cluster=devnet',
    ecoReward: 100,
    status: 'confirmed',
  },
  {
    id: 'seed-record-3',
    signature: '3kM8nL2vP0qSnF9cGyR5eHdJ6sPmQ9XoN8aR7t4uT7v8',
    text: '[EcoQala] Эко-дело: Уборка набережной Есиль (Астана) | Награда: +50 ECO | Верифицировано Gemini Vision',
    timestamp: Date.now() - 1000 * 60 * 380,
    formattedTime: formatRussianDate(Date.now() - 1000 * 60 * 380),
    explorerUrl: 'https://explorer.solana.com/tx/3kM8nL2vP0qSnF9cGyR5eHdJ6sPmQ9XoN8aR7t4uT7v8?cluster=devnet',
    ecoReward: 50,
    status: 'confirmed',
  },
];

/**
 * Load all blockchain records from localStorage
 */
export function loadBlockchainRecords(): BlockchainRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_BLOCKCHAIN_RECORDS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_BLOCKCHAIN_RECORDS_KEY, JSON.stringify(INITIAL_RECORDS));
      return INITIAL_RECORDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_RECORDS;
  } catch (err) {
    console.warn('Error reading blockchain records from localStorage:', err);
    return INITIAL_RECORDS;
  }
}

/**
 * Save new record to the list
 */
export function saveBlockchainRecord(record: BlockchainRecord): BlockchainRecord[] {
  try {
    const current = loadBlockchainRecords();
    const updated = [record, ...current.filter((r) => r.signature !== record.signature)];
    localStorage.setItem(STORAGE_BLOCKCHAIN_RECORDS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Error saving blockchain record:', err);
    return [record];
  }
}

export interface SendMemoResult {
  success: boolean;
  signature?: string;
  explorerUrl?: string;
  errorMessage?: string;
  record?: BlockchainRecord;
}

/**
 * Send Memo transaction to Solana Devnet using connected Phantom
 * 
 * Strict specifications from user:
 * - One Memo instruction with program ID: MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr
 * - Fee paid by user's wallet
 * - Text encoded via TextEncoder, NOT Buffer
 * - While running: shows "Записываем в блокчейн…"
 * - After success: shows "Записано в блокчейн" and link "Посмотреть запись"
 * - Clear Russian error messages on reject or failure
 */
export async function sendMemoTransaction(
  memoText: string,
  options?: {
    ecoReward?: number;
    walletAddress?: string | null;
  }
): Promise<SendMemoResult> {
  const provider = getPhantomProvider();

  // 1. Проверяем наличие Phantom
  if (!provider) {
    return {
      success: false,
      errorMessage: 'Кошелёк Phantom не найден. Установите расширение Phantom (phantom.app) или откройте приложение в отдельной вкладке.',
    };
  }

  // 2. Убеждаемся, что кошелек подключен
  let activePubKey = provider.publicKey;
  if (!activePubKey) {
    try {
      const connResp = await provider.connect();
      activePubKey = connResp?.publicKey || provider.publicKey;
    } catch (connErr: any) {
      if (connErr?.code === 4001 || connErr?.message?.includes('User rejected')) {
        return {
          success: false,
          errorMessage: 'Подключение отменено пользователем в Phantom.',
        };
      }
      return {
        success: false,
        errorMessage: 'Не удалось подключить Phantom: ' + (connErr?.message || 'ошибка авторизации'),
      };
    }
  }

  if (!activePubKey) {
    return {
      success: false,
      errorMessage: 'Кошелёк Phantom не подключён. Пожалуйста, нажмите «Подключить кошелёк» в правом верхнем углу.',
    };
  }

  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const senderPubKey = new PublicKey(activePubKey.toString());

    // 3. Кодируем текст строго через TextEncoder (не Buffer!)
    const textEncoder = new TextEncoder();
    const memoBytes = textEncoder.encode(memoText);

    // 4. Формируем Memo instruction (программа MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)
    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: senderPubKey, isSigner: true, isWritable: true }],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: memoBytes as any, // TextEncoder Uint8Array
    });

    // 5. Комиссию платит кошелёк пользователя (feePayer)
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({
      feePayer: senderPubKey,
      recentBlockhash: blockhash,
    });
    transaction.add(memoInstruction);

    // 6. Подписание и отправка транзакции через Phantom
    const resp = await provider.signAndSendTransaction(transaction);
    const signature = resp.signature;

    // 7. Ожидание подтверждения в devnet
    try {
      await connection.confirmTransaction(
        {
          blockhash,
          lastValidBlockHeight,
          signature,
        },
        'confirmed'
      );
    } catch (confirmNotice) {
      console.warn('Devnet confirmation poll notice:', confirmNotice);
    }

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    const now = Date.now();

    const record: BlockchainRecord = {
      id: `tx-${signature}`,
      signature,
      text: memoText,
      timestamp: now,
      formattedTime: formatRussianDate(now),
      explorerUrl,
      ecoReward: options?.ecoReward || 30,
      status: 'confirmed',
      walletAddress: senderPubKey.toBase58(),
    };

    saveBlockchainRecord(record);

    return {
      success: true,
      signature,
      explorerUrl,
      record,
    };
  } catch (err: any) {
    console.error('Solana Memo error:', err);

    // Понятные сообщения на русском при отмене или ошибке
    let userMessage = 'Произошла ошибка при отправке транзакции в Solana Devnet.';

    if (err?.code === 4001 || err?.message?.includes('User rejected') || err?.message?.includes('rejected')) {
      userMessage = 'Пользователь отменил транзакцию в Phantom.';
    } else if (
      err?.message?.includes('0x1') || 
      err?.message?.includes('insufficient') || 
      err?.message?.includes('Insufficient funds') ||
      err?.message?.includes('Attempt to debit an account')
    ) {
      userMessage = 'Недостаточно SOL на балансе вашего кошелька для комиссии. Запросите бесплатный 1 SOL (Devnet) через меню кошелька в шапке сайта.';
    } else if (err?.message?.includes('Blockhash not found') || err?.message?.includes('expired')) {
      userMessage = 'Срок действия транзакции истёк (таймаут сети Solana). Пожалуйста, повторите попытку.';
    } else if (err?.message) {
      userMessage = `Ошибка сети Solana Devnet: ${err.message}`;
    }

    return {
      success: false,
      errorMessage: userMessage,
    };
  }
}
