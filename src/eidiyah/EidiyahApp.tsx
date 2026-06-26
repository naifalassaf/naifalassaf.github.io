import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  ConfigProvider,
  Flex,
  Form,
  Input,
  Select,
  Typography,
  Space,
  Divider,
  Tag,
  Alert,
  theme,
} from 'antd'
import arEG from 'antd/locale/ar_EG'
import enUS from 'antd/locale/en_US'
import {
  PlusOutlined, DeleteOutlined, ArrowRightOutlined, ImportOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

// ── Eid palette ─────────────────────────────────────────────────────────
const C = {
  bg:          '#04091a',
  card:        '#08122e',
  cardHover:   '#0d1a40',
  border:      '#1a2d5a',
  borderLight: '#243f78',
  gold:        '#c9a227',
  goldLight:   '#e8ba30',
  goldFaint:   'rgba(201, 162, 39, 0.12)',
  goldBorder:  'rgba(201, 162, 39, 0.25)',
  cream:       '#f7e8c0',
  muted:       '#8a7a52',
  dim:         '#4a5a7a',
  error:       '#e07070',
}

// ── Logic ──────────────────────────────────────────────────────────────

type Exclusion = [string, string]
type Assignment = {
  giver: string
  receiver: string
  excludeList?: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isValid(givers: string[], receivers: string[], exclusions: Exclusion[]): boolean {
  for (let i = 0; i < givers.length; i++) {
    if (givers[i] === receivers[i]) return false
    for (const [a, b] of exclusions) {
      if (
        (givers[i] === a && receivers[i] === b) ||
        (givers[i] === b && receivers[i] === a)
      )
        return false
    }
  }
  return true
}

function generate(names: string[], exclusions: Exclusion[]): string[] | null {
  for (let i = 0; i < 1000; i++) {
    const shuffled = shuffle(names)
    if (isValid(names, shuffled, exclusions)) return shuffled
  }
  return null
}

function parseText(raw: string): { name: string; exclude?: string }[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const [name, exclude] = line.split(',').map(s => s.trim())
      return { name, exclude: exclude || undefined }
    })
}

// Builds a WhatsApp share URL for a given participant.
// If the participant excluded others, those assignments are bundled into the same message.
function buildWhatsAppUrl(
  recipientName: string,
  allResults: Assignment[],
  isArabic: boolean,
): string {
  const own = allResults.find(a => a.giver === recipientName)!
  const bundled = (own.excludeList ?? [])
    .map(name => allResults.find(a => a.giver === name))
    .filter((a): a is Assignment => a !== undefined)

  let msg: string
  if (bundled.length === 0) {
    msg = isArabic
      ? `اهلاً ${recipientName}،\n\nعيديتك هالسنة لـ ${own.receiver} 🎁`
      : `Hi ${recipientName},\n\nYour Eidiyah this year is for ${own.receiver} 🎁`
  } else {
    const header = isArabic
      ? `اهلاً ${recipientName}،\n\n🎁 العيديّات هالسنة:`
      : `Hi ${recipientName},\n\n🎁 Eidiyah assignments:`
    const lines = [
      isArabic ? `• عيديتك: ${own.receiver}` : `• Your gift: ${own.receiver}`,
      ...bundled.map(a =>
        isArabic
          ? `• عيديّة ${a.giver}: ${a.receiver}`
          : `• ${a.giver}'s gift: ${a.receiver}`
      ),
    ]
    msg = `${header}\n${lines.join('\n')}`
  }

  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}

// ── Types ───────────────────────────────────────────────────────────────

interface ParticipantField {
  name: string
  exclude?: string[]
}

// ── Component ───────────────────────────────────────────────────────────

export default function EidiyahApp() {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const dir = isArabic ? 'rtl' : 'ltr'

  const [form] = Form.useForm<{ participants: ParticipantField[] }>()
  const watched: ParticipantField[] = Form.useWatch('participants', form) ?? []
  const [results, setResults] = useState<Assignment[] | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resultKey, setResultKey] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  function toggleLang() {
    i18n.changeLanguage(isArabic ? 'en' : 'ar')
  }

  function handleImport() {
    const parsed = parseText(importText)
    if (parsed.length < 3) { setImportError(t('minParticipants')); return }
    const names = new Set(parsed.map(p => p.name))
    for (const p of parsed) {
      if (p.exclude && !names.has(p.exclude)) {
        setImportError(t('invalidExclude', { exclude: p.exclude, name: p.name }))
        return
      }
    }
    setImportError(null)
    form.setFieldsValue({
      participants: parsed.map(p => ({ ...p, exclude: p.exclude ? [p.exclude] : undefined })),
    })
    setImportOpen(false)
    setImportText('')
    setResults(null)
  }

  function handleShuffle() {
    setSubmitError(null)
    form.validateFields().then(({ participants }) => {
      const names = participants.map(p => p.name.trim())
      if (new Set(names).size !== names.length) { setSubmitError(t('duplicateNames')); return }
      const exclusions: Exclusion[] = participants.flatMap(p =>
        (p.exclude ?? []).map(ex => [p.name.trim(), ex] as Exclusion)
      )
      const receivers = generate(names, exclusions)
      if (!receivers) { setSubmitError(t('noAssignment')); return }
      setResults(names.map((name, i) => {
        const p = participants[names.indexOf(name)]
        return {
          giver: name,
          receiver: receivers[i],
          excludeList: p.exclude?.length ? p.exclude : undefined,
        }
      }))
      setResultKey(k => k + 1)
    })
  }

  return (
    <ConfigProvider
      direction={dir}
      locale={isArabic ? arEG : enUS}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary:          C.gold,
          colorBgBase:           C.bg,
          colorBgContainer:      C.card,
          colorBgElevated:       C.card,
          colorBorder:           C.border,
          colorText:             C.cream,
          colorTextSecondary:    C.muted,
          colorTextPlaceholder:  C.dim,
          colorError:            C.error,
          borderRadius:          10,
          fontFamily: isArabic
            ? '"Noto Sans Arabic", "Segoe UI", system-ui, sans-serif'
            : 'Inter, system-ui, sans-serif',
        },
        components: {
          Input:  { colorBgContainer: C.bg },
          Select: { colorBgContainer: C.bg },
          Button: { defaultBg: 'transparent' },
        },
      }}
    >
      <div dir={dir} style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Star field */}
        <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `
            radial-gradient(1px 1px at 12% 18%, rgba(201,162,39,.55) 0%, transparent 100%),
            radial-gradient(1px 1px at 28% 42%, rgba(201,162,39,.35) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 45% 8%,  rgba(201,162,39,.6)  0%, transparent 100%),
            radial-gradient(1px 1px at 61% 27%, rgba(201,162,39,.4)  0%, transparent 100%),
            radial-gradient(1px 1px at 74% 63%, rgba(201,162,39,.3)  0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 88% 14%, rgba(201,162,39,.5)  0%, transparent 100%),
            radial-gradient(1px 1px at 7%  75%, rgba(201,162,39,.35) 0%, transparent 100%),
            radial-gradient(1px 1px at 34% 82%, rgba(201,162,39,.3)  0%, transparent 100%),
            radial-gradient(1px 1px at 52% 55%, rgba(201,162,39,.45) 0%, transparent 100%),
            radial-gradient(1px 1px at 67% 89%, rgba(201,162,39,.3)  0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 81% 38%, rgba(201,162,39,.55) 0%, transparent 100%),
            radial-gradient(1px 1px at 93% 72%, rgba(201,162,39,.35) 0%, transparent 100%),
            radial-gradient(1px 1px at 19% 60%, rgba(201,162,39,.3)  0%, transparent 100%),
            radial-gradient(1px 1px at 40% 95%, rgba(201,162,39,.25) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 57% 33%, rgba(201,162,39,.5)  0%, transparent 100%)
          `}} />
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(201,162,39,.06) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(201,162,39,.05) 0%, transparent 70%)', borderRadius: '50%' }} />
        </div>

        {/* Header */}
        <header style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a
              href="/"
              style={{ color: C.muted, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
            >
              {isArabic ? 'نايف العساف ←' : '← naif alassaf'}
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button
                type="text"
                onClick={toggleLang}
                style={{
                  color: C.muted,
                  fontFamily: isArabic ? 'JetBrains Mono, monospace' : '"Noto Sans Arabic", sans-serif',
                  fontSize: isArabic ? 13 : 14,
                  padding: '0 8px',
                  height: 'auto',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                }}
              >
                {isArabic ? 'English' : 'العربية'}
              </Button>
              <Text style={{ color: C.border, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                eidiyah
              </Text>
            </div>
          </div>
        </header>

        {/* Main */}
        <main style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '56px 24px', position: 'relative', zIndex: 1 }}>

          {/* Title */}
          <div style={{ marginBottom: 40 }}>
            <Text style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: C.gold,
              fontSize: 11,
              letterSpacing: 3,
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 10,
            }}>
              {t('subtitle')}
            </Text>
            <Title level={1} style={{ margin: 0, fontSize: 52, fontWeight: 800, lineHeight: 1.1,
              background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 50%, #a07818 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {isArabic ? '✦ عيدية ✦' : '✦ Eidiyah ✦'}
            </Title>
            <Paragraph style={{ color: C.muted, marginTop: 14, marginBottom: 0, fontSize: 16, lineHeight: 1.7 }}>
              {t('description')}
            </Paragraph>
          </div>

          {/* Import from text */}
          <div style={{ marginBottom: 24 }}>
            <Button
              type="text"
              icon={<ImportOutlined />}
              onClick={() => { setImportOpen(o => !o); setImportError(null) }}
              style={{
                color: importOpen ? C.gold : C.muted,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                padding: '0 4px',
                height: 'auto',
              }}
            >
              {importOpen ? t('cancelImport') : t('importFromText')}
            </Button>

            {importOpen && (
              <div style={{
                marginTop: 12,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '16px',
                animation: 'fadeSlideIn 0.2s ease both',
              }}>
                <Text style={{ color: C.muted, fontSize: 13, display: 'block', marginBottom: 8 }}>
                  {t('importHint', { code: ',Name' }).split('<code>').map((part, i) =>
                    i === 0 ? part : part.split('</code>').map((p, j) =>
                      j === 0 ? <Text key={j} code style={{ fontSize: 12 }}>{p}</Text> : p
                    )
                  )}
                </Text>

                <div style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: C.dim,
                  marginBottom: 10,
                  lineHeight: 1.8,
                  direction: 'ltr',
                  textAlign: 'left',
                }}>
                  Ahmed<br />
                  <span style={{ color: C.muted }}>Sara</span>
                  <span style={{ color: C.border }}>,</span>
                  <span style={{ color: C.gold }}>Ahmed</span>
                  <span style={{ color: C.dim }}>  {t('importExcludeNote')}</span><br />
                  Naif<br />
                  Lina
                </div>

                <Input.TextArea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={'Ahmed\nSara,Ahmed\nNaif\nLina'}
                  rows={6}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    color: C.cream,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    resize: 'vertical',
                    marginBottom: 10,
                    direction: 'ltr',
                  }}
                  spellCheck={false}
                />

                {importError && (
                  <Alert description={importError} type="error" showIcon style={{ marginBottom: 10 }} />
                )}

                <Button
                  type="primary"
                  block
                  onClick={handleImport}
                  style={{ background: C.gold, color: C.bg, border: 'none', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}
                >
                  {t('apply')}
                </Button>
              </div>
            )}
          </div>

          {/* Form */}
          <Form
            form={form}
            initialValues={{ participants: [{ name: '' }, { name: '' }, { name: '' }] }}
            layout="vertical"
            requiredMark={false}
          >
            <Form.List
              name="participants"
              rules={[{ validator: async (_, fields) => { if (!fields || fields.length < 3) return Promise.reject(t('minParticipants')) } }]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  <Flex vertical gap={8} style={{ width: '100%' }}>
                    {fields.map(({ key, name: fieldIdx }) => {
                      const otherNames = watched
                        .filter((_, i) => i !== fieldIdx)
                        .map(p => p?.name?.trim())
                        .filter(Boolean)

                      return (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            borderRadius: 12,
                            padding: '14px 16px',
                          }}
                        >
                          <span style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 11,
                            color: C.gold,
                            paddingTop: 7,
                            minWidth: 20,
                            userSelect: 'none',
                            opacity: 0.5,
                          }}>
                            {String(fieldIdx + 1).padStart(2, '0')}
                          </span>

                          <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <Form.Item
                              name={[fieldIdx, 'name']}
                              rules={[{ required: true, message: t('nameRequired') }]}
                              style={{ flex: '1 1 140px', marginBottom: 0 }}
                            >
                              <Input placeholder={t('participantName')} />
                            </Form.Item>

                            <Form.Item
                              name={[fieldIdx, 'exclude']}
                              style={{ flex: '2 1 200px', marginBottom: 0 }}
                              tooltip={t('cantBePairedWith')}
                            >
                              <Select
                                mode="multiple"
                                placeholder={t('cantBePairedWith')}
                                allowClear
                                disabled={otherNames.length === 0}
                                options={otherNames.map(n => ({ label: n, value: n }))}
                                popupMatchSelectWidth={false}
                              />
                            </Form.Item>
                          </div>

                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(fieldIdx)}
                            disabled={fields.length <= 3}
                            style={{ color: fields.length <= 3 ? C.card : C.dim, marginTop: 2, flexShrink: 0 }}
                          />
                        </div>
                      )
                    })}
                  </Flex>

                  {errors.length > 0 && <div style={{ marginTop: 8 }}><Form.ErrorList errors={errors} /></div>}

                  <Button
                    type="dashed"
                    onClick={() => add({ name: '' })}
                    icon={<PlusOutlined />}
                    style={{ width: '100%', marginTop: 12, color: C.gold, borderColor: C.borderLight, background: 'transparent', height: 44 }}
                  >
                    {t('addParticipant')}
                  </Button>
                </>
              )}
            </Form.List>

            {submitError && <Alert description={submitError} type="error" showIcon style={{ marginTop: 16 }} />}

            <Button
              size="large"
              block
              onClick={handleShuffle}
              style={{
                marginTop: 20,
                height: 54,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: 14,
                background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold})`,
                color: C.bg,
                border: 'none',
                letterSpacing: 1,
                boxShadow: `0 4px 24px rgba(201, 162, 39, 0.25)`,
              }}
            >
              {t('shuffle')}
            </Button>
          </Form>

          {/* Results */}
          {results && (
            <div key={resultKey}>
              <Divider style={{ borderColor: C.border, marginTop: 40 }}>
                <Text style={{ color: C.gold, fontSize: 16 }}>✦</Text>
              </Divider>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: C.cream, fontWeight: 600, fontSize: 16 }}>
                  {t('assignments')}{' '}
                  <Text style={{ color: C.dim, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {t('pairs', { count: results.length })}
                  </Text>
                </Text>
                <Button
                  type="text"
                  size="small"
                  onClick={handleShuffle}
                  style={{ color: C.gold, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                >
                  {t('shuffleAgain')}
                </Button>
              </div>

              <Flex vertical gap={8} style={{ width: '100%' }}>
                {results.map(({ giver, receiver, excludeList }, i) => {
                  const bundledCount = (excludeList ?? []).filter(name => results.some(a => a.giver === name)).length
                  const whatsappUrl = buildWhatsAppUrl(giver, results, isArabic)

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 12,
                        padding: '14px 20px',
                        animation: 'fadeSlideIn 0.35s ease both',
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      <Text strong style={{ color: C.cream, fontSize: 15, minWidth: 80 }}>{giver}</Text>
                      <Space size={6}>
                        <Text style={{ color: C.dim, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                          {t('giftsTo')}
                        </Text>
                        <ArrowRightOutlined style={{ color: C.gold, fontSize: 12, transform: isArabic ? 'scaleX(-1)' : undefined }} />
                      </Space>
                      <Space size={8}>
                        <Tag style={{
                          background: C.goldFaint,
                          border: `1px solid ${C.goldBorder}`,
                          color: C.goldLight,
                          fontWeight: 600,
                          fontSize: 14,
                          padding: '4px 14px',
                          borderRadius: 8,
                          margin: 0,
                          minWidth: 80,
                          textAlign: isArabic ? 'left' : 'right',
                        }}>
                          {receiver}
                        </Tag>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('shareOnWhatsApp')}
                        >
                          <div style={{ position: 'relative', display: 'inline-flex' }}>
                            <Button
                              type="text"
                              size="small"
                              icon={<WhatsAppOutlined style={{ color: C.gold, fontSize: 16 }} />}
                              style={{ padding: '0 4px' }}
                            />
                            {bundledCount > 0 && (
                              <span style={{
                                position: 'absolute',
                                top: -4,
                                insetInlineEnd: -4,
                                background: C.gold,
                                color: C.bg,
                                borderRadius: '50%',
                                width: 14,
                                height: 14,
                                fontSize: 9,
                                fontFamily: 'JetBrains Mono, monospace',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1,
                                pointerEvents: 'none',
                              }}>
                                {bundledCount + 1}
                              </span>
                            )}
                          </div>
                        </a>
                      </Space>
                    </div>
                  )
                })}
              </Flex>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: '20px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Text style={{ color: C.border, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
            {t('footer')}
          </Text>
        </footer>

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .ant-form-item-explain-error { font-size: 12px; }
        `}</style>
      </div>
    </ConfigProvider>
  )
}
