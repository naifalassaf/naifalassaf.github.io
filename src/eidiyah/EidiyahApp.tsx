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
import { PlusOutlined, DeleteOutlined, ArrowRightOutlined, ImportOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

// ── Logic ──────────────────────────────────────────────────────────────

type Exclusion = [string, string]
type Assignment = { giver: string; receiver: string }

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

// ── Types ───────────────────────────────────────────────────────────────

interface ParticipantField {
  name: string
  exclude?: string
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
    if (parsed.length < 3) {
      setImportError(t('minParticipants'))
      return
    }
    const names = new Set(parsed.map(p => p.name))
    for (const p of parsed) {
      if (p.exclude && !names.has(p.exclude)) {
        setImportError(t('invalidExclude', { exclude: p.exclude, name: p.name }))
        return
      }
    }
    setImportError(null)
    form.setFieldsValue({ participants: parsed })
    setImportOpen(false)
    setImportText('')
    setResults(null)
  }

  function handleShuffle() {
    setSubmitError(null)
    form.validateFields().then(({ participants }) => {
      const names = participants.map(p => p.name.trim())

      if (new Set(names).size !== names.length) {
        setSubmitError(t('duplicateNames'))
        return
      }

      const exclusions: Exclusion[] = participants
        .filter(p => p.exclude)
        .map(p => [p.name.trim(), p.exclude!])

      const receivers = generate(names, exclusions)
      if (!receivers) {
        setSubmitError(t('noAssignment'))
        return
      }

      setResults(names.map((name, i) => ({ giver: name, receiver: receivers[i] })))
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
          colorPrimary: '#22d3ee',
          colorBgBase: '#0f172a',
          colorBgContainer: '#1e293b',
          colorBgElevated: '#1e293b',
          colorBorder: '#334155',
          colorText: '#f1f5f9',
          colorTextSecondary: '#94a3b8',
          colorTextPlaceholder: '#475569',
          colorError: '#f87171',
          borderRadius: 10,
          fontFamily: isArabic
            ? '"Noto Sans Arabic", "Segoe UI", system-ui, sans-serif'
            : 'Inter, system-ui, sans-serif',
        },
        components: {
          Input: { colorBgContainer: '#0f172a' },
          Select: { colorBgContainer: '#0f172a' },
          Button: { defaultBg: 'transparent' },
        },
      }}
    >
      <div dir={dir} style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header style={{ borderBottom: '1px solid #1e293b', padding: '16px 24px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a
              href="/"
              style={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              {isArabic ? 'نايف العساف ←' : '← naif alassaf'}
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button
                type="text"
                onClick={toggleLang}
                style={{
                  color: '#64748b',
                  fontFamily: isArabic ? 'JetBrains Mono, monospace' : '"Noto Sans Arabic", sans-serif',
                  fontSize: isArabic ? 13 : 14,
                  padding: '0 8px',
                  height: 'auto',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                }}
              >
                {isArabic ? 'English' : 'العربية'}
              </Button>
              <Text style={{ color: '#334155', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                eidiyah
              </Text>
            </div>
          </div>
        </header>

        {/* Main */}
        <main style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '56px 24px' }}>

          {/* Title */}
          <div style={{ marginBottom: 40 }}>
            <Text style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: '#22d3ee',
              fontSize: 11,
              letterSpacing: 3,
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 10,
            }}>
              {t('subtitle')}
            </Text>
            <Title level={1} style={{ color: '#f1f5f9', margin: 0, fontSize: 48, fontWeight: 800, lineHeight: 1.1 }}>
              {isArabic ? 'عيدية' : 'Eidiyah'}
            </Title>
            <Paragraph style={{ color: '#94a3b8', marginTop: 12, marginBottom: 0, fontSize: 16, lineHeight: 1.7 }}>
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
                color: importOpen ? '#22d3ee' : '#64748b',
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
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 12,
                padding: '16px',
                animation: 'fadeSlideIn 0.2s ease both',
              }}>
                <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>
                  {t('importHint', { code: ',Name' }).split('<code>').map((part, i) =>
                    i === 0 ? part : part.split('</code>').map((p, j) =>
                      j === 0
                        ? <Text key={j} code style={{ fontSize: 12 }}>{p}</Text>
                        : p
                    )
                  )}
                </Text>

                <div style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: '#475569',
                  marginBottom: 10,
                  lineHeight: 1.8,
                  direction: 'ltr',
                  textAlign: 'left',
                }}>
                  Ahmed<br />
                  <span style={{ color: '#94a3b8' }}>Sara</span>
                  <span style={{ color: '#334155' }}>,</span>
                  <span style={{ color: '#22d3ee' }}>Ahmed</span>
                  <span style={{ color: '#475569' }}>  {t('importExcludeNote')}</span><br />
                  Naif<br />
                  Lina
                </div>

                <Input.TextArea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={'Ahmed\nSara,Ahmed\nNaif\nLina'}
                  rows={6}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#f1f5f9',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    resize: 'vertical',
                    marginBottom: 10,
                    direction: 'ltr',
                  }}
                  spellCheck={false}
                />

                {importError && (
                  <Alert
                    description={importError}
                    type="error"
                    showIcon
                    style={{ marginBottom: 10 }}
                  />
                )}

                <Button
                  type="primary"
                  block
                  onClick={handleImport}
                  style={{
                    background: '#22d3ee',
                    color: '#0f172a',
                    border: 'none',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                  }}
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
              rules={[{
                validator: async (_, fields) => {
                  if (!fields || fields.length < 3)
                    return Promise.reject(t('minParticipants'))
                },
              }]}
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
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 12,
                            padding: '14px 16px',
                          }}
                        >
                          <span style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 11,
                            color: '#475569',
                            paddingTop: 7,
                            minWidth: 20,
                            userSelect: 'none',
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
                              style={{ flex: '1 1 200px', marginBottom: 0 }}
                              tooltip={t('cantBePairedWith')}
                            >
                              <Select
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
                            style={{
                              color: fields.length <= 3 ? '#1e293b' : '#475569',
                              marginTop: 2,
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      )
                    })}
                  </Flex>

                  {errors.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Form.ErrorList errors={errors} />
                    </div>
                  )}

                  <Button
                    type="dashed"
                    onClick={() => add({ name: '' })}
                    icon={<PlusOutlined />}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      color: '#22d3ee',
                      borderColor: '#1e4e5f',
                      background: 'transparent',
                      height: 44,
                    }}
                  >
                    {t('addParticipant')}
                  </Button>
                </>
              )}
            </Form.List>

            {submitError && (
              <Alert
                description={submitError}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            <Button
              size="large"
              block
              onClick={handleShuffle}
              style={{
                marginTop: 20,
                height: 52,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: 14,
                background: '#22d3ee',
                color: '#0f172a',
                border: 'none',
                letterSpacing: 1,
              }}
            >
              {t('shuffle')}
            </Button>
          </Form>

          {/* Results */}
          {results && (
            <div key={resultKey}>
              <Divider style={{ borderColor: '#1e293b', marginTop: 40 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 16 }}>
                  {t('assignments')}{' '}
                  <Text style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {t('pairs', { count: results.length })}
                  </Text>
                </Text>
                <Button
                  type="text"
                  size="small"
                  onClick={handleShuffle}
                  style={{ color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                >
                  {t('shuffleAgain')}
                </Button>
              </div>

              <Flex vertical gap={8} style={{ width: '100%' }}>
                {results.map(({ giver, receiver }, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 12,
                      padding: '14px 20px',
                      animation: 'fadeSlideIn 0.35s ease both',
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    <Text strong style={{ color: '#f1f5f9', fontSize: 15, minWidth: 80 }}>
                      {giver}
                    </Text>
                    <Space size={6}>
                      <Text style={{ color: '#475569', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                        {t('giftsTo')}
                      </Text>
                      <ArrowRightOutlined style={{ color: '#22d3ee', fontSize: 12, transform: isArabic ? 'scaleX(-1)' : undefined }} />
                    </Space>
                    <Tag style={{
                      background: 'rgba(34, 211, 238, 0.1)',
                      border: '1px solid rgba(34, 211, 238, 0.2)',
                      color: '#67e8f9',
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
                  </div>
                ))}
              </Flex>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #1e293b', padding: '20px', textAlign: 'center' }}>
          <Text style={{ color: '#334155', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
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
