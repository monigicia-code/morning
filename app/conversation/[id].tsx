import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, MoreHorizontal, Flag, Ban, Trash2, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { ReportModal } from '@/components/ReportModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTimeAgo } from '@/utils';
import type { Message, AnonymousIdentity } from '@/types/database';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const timeAgo = useTimeAgo();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherIdentity, setOtherIdentity] = useState<AnonymousIdentity | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .eq('deleted_at', null)
        .order('created_at', { ascending: true });
      setMessages((messagesData ?? []) as Message[]);

      const { data: otherMember } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', id)
        .neq('user_id', user.id)
        .maybeSingle();
      if (otherMember) {
        setOtherUserId(otherMember.user_id);
        const { data: ai } = await supabase
          .from('anonymous_identities')
          .select('*')
          .eq('user_id', otherMember.user_id)
          .eq('is_primary', true)
          .maybeSingle();
        setOtherIdentity(ai as AnonymousIdentity | null);
        const { data: blockRecord } = await supabase
          .from('blocks')
          .select('id')
          .eq('blocker_id', user.id)
          .eq('blocked_id', otherMember.user_id)
          .maybeSingle();
        setBlocked(!!blockRecord);
      }

      // Mark conversation as read
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', id)
        .eq('user_id', user.id);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`conversation:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  const send = async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    setInput('');
    const { error } = await supabase.from('messages').insert({
      conversation_id: id,
      sender_id: user.id,
      body: input.trim(),
    });
    setSending(false);
    if (error) {
      setInput(input);
      Alert.alert(t('common.error'), error.message);
    }
  };

  const blockUser = async () => {
    if (!user || !otherUserId) return;
    await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: otherUserId });
    setBlocked(true);
    setMenuOpen(false);
  };

  const deleteConversation = async () => {
    Alert.alert(t('messages.deleteConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('conversation_members').delete().eq('conversation_id', id).eq('user_id', user!.id);
          router.back();
        },
      },
    ]);
  };

  const otherName = otherIdentity?.nickname?.trim() || `Kindred #${otherIdentity?.display_code ?? '?????'}`;

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        {!isMe && <Avatar identity={otherIdentity} size={28} />}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isMe ? theme.brand : theme.bgCard,
              borderColor: theme.border,
              maxWidth: '75%',
            },
          ]}
        >
          <ThemedText
            variant="body"
            color={isMe ? 'inverse' : 'primary'}
            style={{ lineHeight: 20 }}
          >
            {item.body}
          </ThemedText>
          <ThemedText
            variant="caption"
            color={isMe ? 'inverse' : 'tertiary'}
            style={{ marginTop: 4, opacity: 0.7, textAlign: isMe ? 'right' : 'left' }}
          >
            {timeAgo(item.created_at)}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 }}>
          <Avatar identity={otherIdentity} size={32} />
          <ThemedText variant="label" style={{ marginLeft: 8 }} numberOfLines={1}>
            {otherName}
          </ThemedText>
        </View>
        <Pressable onPress={() => setMenuOpen(!menuOpen)} hitSlop={12}>
          <MoreHorizontal size={24} color={theme.text} />
        </Pressable>
      </View>

      {menuOpen && (
        <View style={[styles.menu, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
          <Pressable onPress={() => { setReportVisible(true); setMenuOpen(false); }} style={styles.menuItem}>
            <Flag size={16} color={theme.textSecondary} />
            <ThemedText variant="body" style={{ marginLeft: 10 }}>{t('messages.conversation.report')}</ThemedText>
          </Pressable>
          {!blocked && (
            <Pressable onPress={blockUser} style={styles.menuItem}>
              <Ban size={16} color={theme.error} />
              <ThemedText variant="body" color="error" style={{ marginLeft: 10 }}>{t('messages.conversation.block')}</ThemedText>
            </Pressable>
          )}
          <Pressable onPress={deleteConversation} style={styles.menuItem}>
            <Trash2 size={16} color={theme.error} />
            <ThemedText variant="body" color="error" style={{ marginLeft: 10 }}>{t('messages.conversation.delete')}</ThemedText>
          </Pressable>
        </View>
      )}

      <View style={[styles.safetyBanner, { backgroundColor: theme.warningBg }]}>
        <ShieldAlert size={14} color={theme.warning} />
        <ThemedText variant="caption" color="secondary" style={{ flex: 1, marginLeft: 8 }}>
          {t('messages.conversation.safetyBanner')}
        </ThemedText>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, flexGrow: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
            <ThemedText variant="body" color="tertiary">{t('messages.empty.chat')}</ThemedText>
          </View>
        }
      />

      {blocked ? (
        <View style={[styles.blockedBar, { backgroundColor: theme.bgSubtle }]}>
          <ThemedText variant="body" color="tertiary" style={{ textAlign: 'center' }}>
            {t('messages.conversation.blocked')}
          </ThemedText>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.inputBar, { backgroundColor: theme.bgElevated, borderTopColor: theme.border }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('messages.conversation.placeholder')}
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { backgroundColor: theme.bgInput, color: theme.text, borderColor: theme.border }]}
              multiline
            />
            <Pressable
              onPress={send}
              disabled={!input.trim() || sending}
              style={[styles.sendBtn, { backgroundColor: input.trim() ? theme.brand : theme.border }]}
            >
              <Send size={20} color={theme.textInverse} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} targetType="user" targetId={otherUserId ?? ''} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  menu: { position: 'absolute', top: 56, right: 16, borderRadius: 12, borderWidth: 1, paddingVertical: 8, zIndex: 10, minWidth: 200, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  safetyBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  blockedBar: { paddingVertical: 16, paddingHorizontal: 20, marginBottom: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 20, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: 'Inter-Regular', maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
