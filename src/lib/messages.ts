import { supabase } from './supabase';

export interface Message {
    id?: number;
    roomId: string;
    userId: string;
    username: string;
    message: string;
    createdAt: number;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
}

const MESSAGES_TABLE = 'messages';

export async function saveMessage(
    roomId: string,
    userId: string,
    username: string,
    message: string,
    fileUrl?: string,
    fileName?: string,
    fileType?: string
): Promise<Message | null> {
    try {
        const { data, error } = await supabase
            .from(MESSAGES_TABLE)
            .insert({
                room_id: roomId,
                user_id: userId,
                username,
                message,
                file_url: fileUrl,
                file_name: fileName,
                file_type: fileType,
                created_at: Date.now()
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            roomId: data.room_id,
            userId: data.user_id,
            username: data.username,
            message: data.message,
            fileUrl: data.file_url,
            fileName: data.file_name,
            fileType: data.file_type,
            createdAt: Number(data.created_at)
        };
    } catch (e) {
        return null;
    }
}

export async function getMessages(roomId: string): Promise<Message[]> {
    try {
        const { data, error } = await supabase
            .from(MESSAGES_TABLE)
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) throw error;

        return data.map((msg: any) => ({
            id: msg.id,
            roomId: msg.room_id,
            userId: msg.user_id,
            username: msg.username,
            message: msg.message,
            fileUrl: msg.file_url,
            fileName: msg.file_name,
            fileType: msg.file_type,
            createdAt: Number(msg.created_at)
        }));
    } catch (e) {
        return [];
    }
}
