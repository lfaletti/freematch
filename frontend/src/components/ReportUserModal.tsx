import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

// Stable reason keys; labels come from i18n (matches.reason*). Keep in sync
// with backend/src/services/reportService.ts REPORT_REASONS.
const REASONS = [
  'harassment',
  'offensive',
  'explicit',
  'spam',
  'impersonation',
  'other',
] as const;

export interface ReportUserModalProps {
  visible: boolean;
  partnerName: string;
  submitting?: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (reason: string, details: string) => void;
}

/**
 * Reason picker shown when the user taps the report (flag) action in the chat.
 * Selecting a reason (and optional evidence text) and confirming reports the
 * partner and removes the match. Mirrors ConfirmModal's appearance.
 */
const ReportUserModal: React.FC<ReportUserModalProps> = ({
  visible,
  partnerName,
  submitting = false,
  error,
  onCancel,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');

  // Reset transient local state each time the sheet opens.
  React.useEffect(() => {
    if (visible) {
      setReason('');
      setDetails('');
    }
  }, [visible]);

  const reasonLabel = (key: string): string => {
    switch (key) {
      case 'harassment': return t('matches.reasonHarassment');
      case 'offensive': return t('matches.reasonOffensive');
      case 'explicit': return t('matches.reasonExplicit');
      case 'spam': return t('matches.reasonSpam');
      case 'impersonation': return t('matches.reasonImpersonation');
      case 'other': return t('matches.reasonOther');
      default: return '';
    }
  };

  const canSubmit = !!reason && !submitting;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Text style={styles.title}>{t('matches.reportTitle', { name: partnerName })}</Text>
            <Text style={styles.question}>
              {t('matches.reportReasonLabel', { name: partnerName })}
            </Text>

            <View style={styles.reasonList}>
              {REASONS.map((key) => {
                const selected = reason === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.reasonItem, selected && styles.reasonItemSelected]}
                    onPress={() => setReason(key)}
                    disabled={submitting}
                  >
                    <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                      {reasonLabel(key)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.detailsInput}
              value={details}
              onChangeText={setDetails}
              placeholder={t('matches.reportDetailsPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              editable={!submitting}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.reportBtn, !canSubmit && styles.btnDisabled]}
                onPress={() => onSubmit(reason, details)}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.reportBtnText}>{t('matches.reportSubmit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    width: Math.min(width * 0.92, 420),
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  question: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 21,
  },
  reasonList: {
    marginBottom: 14,
    gap: 8,
  },
  reasonItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,77,109,0.15)',
  },
  reasonText: {
    fontSize: 15,
    color: colors.text,
  },
  reasonTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  detailsInput: {
    minHeight: 72,
    maxHeight: 140,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: 'top',
    marginBottom: 6,
  },
  errorText: {
    color: colors.nope,
    fontSize: 13,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceLight,
  },
  cancelBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  reportBtn: {
    backgroundColor: colors.nope,
  },
  reportBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ReportUserModal;
