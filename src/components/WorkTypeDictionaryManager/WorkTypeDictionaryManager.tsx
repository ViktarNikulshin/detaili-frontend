import React, { useCallback, useEffect, useRef, useState } from 'react';
import './DictionaryManager.css';
import { WorkType } from '../../types/order';
import { dictionaryApi, DictionaryItemDto, DictionaryRawItem, WorkTypeUpdateDto } from '../../services/dictionaryApi';

// ---------------------------
// ТИПЫ И ИНТЕРФЕЙСЫ
// ---------------------------

// Единый тип для элементов справочника в локальном состоянии
interface DictionaryItemState extends DictionaryItemDto {
    isEditing: boolean;
    description: string;
    active: boolean;
    color: string;
}

// Тип для уведомлений
type Notification = {
    message: string;
    type: "success" | "error";
    visible: boolean;
};

// ---------------------------
// ХУК ДЛЯ УПРАВЛЕНИЯ СКРОЛЛОМ
// ---------------------------
const useScrollPosition = (
    ref: React.RefObject<HTMLElement | null>,
    key: string,
    dependencies: any[]
) => {
    const rememberScroll = useCallback(() => {
        if (ref.current) {
            sessionStorage.setItem(key, ref.current.scrollTop.toString());
        }
    }, [ref, key]);

    const restoreScroll = useCallback(() => {
        const saved = sessionStorage.getItem(key);
        if (saved && ref.current) {
            ref.current.scrollTop = parseInt(saved, 10);
            sessionStorage.removeItem(key);
        }
    }, [ref, key]);

    useEffect(() => {
        restoreScroll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ref, ...dependencies, restoreScroll]);

    return { rememberScroll, restoreScroll };
};

// ---------------------------
// УТИЛИТНЫЕ КОМПОНЕНТЫ
// ---------------------------

const NotificationPopup: React.FC<{ notification: Notification }> = ({ notification }) => {
    const popupClass = `notification-popup ${notification.type} ${notification.visible ? 'visible' : ''}`;
    return (
        <div className={popupClass}>
            {notification.message}
        </div>
    );
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ checked, onChange }) => (
    <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
        />
        <span className="slider round"></span>
    </label>
);

// ---------------------------
// КОМПОНЕНТЫ ТАБЛИЦ И ПАНЕЛЕЙ
// ---------------------------

interface WorkTypeTableProps {
    workTypes: DictionaryItemState[];
    selectedId: number | null;
    isLoading: boolean;
    fetchWorkTypes: () => Promise<void>;
    setSelectedId: (id: number | null) => void;
    listRef: React.RefObject<HTMLDivElement | null>;
}

// Таблица Типов Работ (Левая колонка)
const WorkTypeTable: React.FC<WorkTypeTableProps> = ({
                                                         workTypes,
                                                         selectedId,
                                                         isLoading,
                                                         fetchWorkTypes,
                                                         setSelectedId,
                                                         listRef
                                                     }) => {
    const [newWorkTypeName, setNewWorkTypeName] = useState('');
    const [newWorkTypeCode, setNewWorkTypeCode] = useState('');
    const [newWorkTypeColor, setNewWorkTypeColor] = useState('#3b82f6'); // Дефолтный синий цвет

    const addWorkType = async (e?: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>) => {
        e?.preventDefault();
        if (newWorkTypeName.trim() === '' || newWorkTypeCode.trim() === '') return;

        try {
            // Передаем имя, код и выбранный цвет на бэкенд
            await dictionaryApi.addWorkType(newWorkTypeName.trim(), newWorkTypeCode.trim(), newWorkTypeColor);
            await fetchWorkTypes();
            setNewWorkTypeName('');
            setNewWorkTypeCode('');
            setNewWorkTypeColor('#3b82f6');
        } catch (err) {
            console.error('Ошибка при добавлении типа работы:', err);
            alert('Ошибка при добавлении типа работы.');
        }
    };

    const toggleWorkTypeActiveState = async (itemToToggle: DictionaryItemState) => {
        const updatedItem = { ...itemToToggle, active: !itemToToggle.active };

        try {
            const { isEditing, ...workTypeDto } = updatedItem;
            await dictionaryApi.updateWorkType(workTypeDto as DictionaryItemDto);
            await fetchWorkTypes();
        } catch (err) {
            console.error('Ошибка при обновлении статуса:', err);
            alert('Ошибка при обновлении статуса. Откат изменений.');
            await fetchWorkTypes();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            addWorkType(e);
        }
    };

    return (
        <div className="work-type-column">
            <div className="form-group add-work-type-group">
                <label>Добавить новый тип работы</label>
                <div className="input-with-button" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="text" placeholder="Название типа работы" value={newWorkTypeName}
                           onChange={(e) => setNewWorkTypeName(e.target.value)}
                           onKeyDown={handleKeyDown}
                           disabled={isLoading}/>
                    <input type="text" placeholder="Код" value={newWorkTypeCode}
                           onChange={(e) => setNewWorkTypeCode(e.target.value)}
                           onKeyDown={handleKeyDown}
                           disabled={isLoading}/>

                    {/* Выбор цвета для новой услуги */}
                    <div className="color-picker-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={newWorkTypeColor}
                            onChange={(e) => setNewWorkTypeColor(e.target.value)}
                            title="Цвет в календаре"
                            style={{ width: '40px', height: '40px', padding: '0', cursor: 'pointer', border: 'none', background: 'none' }}
                            disabled={isLoading}
                        />
                    </div>

                    <button type="button" className="add-button" onClick={addWorkType}
                            disabled={!newWorkTypeName.trim() || !newWorkTypeCode.trim() || isLoading}>
                        Добавить
                    </button>
                </div>
            </div>

            <div className="dictionary-table-scroll-container" ref={listRef}>
                <table className="dictionary-table">
                    <thead>
                    <tr>
                        <th style={{width: '55%'}}>Тип работы</th>
                        <th style={{width: '25%'}} className="hide-on-mobile">Код</th>
                        <th style={{width: '20%', textAlign: 'center'}}>Актив.</th>
                    </tr>
                    </thead>
                    <tbody>
                    {workTypes.length === 0 && (
                        <tr>
                            <td colSpan={3} className="empty-message">Нет данных для отображения.</td>
                        </tr>
                    )}
                    {workTypes.map(item => (
                        <tr key={item.id} className={!item.active ? 'inactive-row' : ''}>
                            <td
                                className={`work-type-name-cell ${item.id === selectedId ? 'selected' : ''}`}
                                onClick={() => setSelectedId(item.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {/* Цветной маркер услуги */}
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundColor: item.color || '#ffffff',
                                            flexShrink: 0
                                        }}
                                    />
                                    <span>{item.name}</span>
                                </div>
                            </td>
                            <td className="hide-on-mobile">
                                <span>{item.code}</span>
                            </td>
                            <td style={{textAlign: 'center'}}>
                                <ToggleSwitch
                                    checked={item.active}
                                    onChange={() => {
                                        toggleWorkTypeActiveState(item);
                                    }}
                                />
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


interface WorkTypeEditPanelProps {
    workType: DictionaryItemState;
    rememberScroll: () => void;
    fetchWorkTypes: () => Promise<void>;
    showNotification: (notification: Omit<Notification, 'visible'>) => void;
}

// Панель Редактирования Типа Работы (Правая колонка вместо менеджера частей)
const WorkTypeEditPanel: React.FC<WorkTypeEditPanelProps> = ({ workType, rememberScroll, fetchWorkTypes, showNotification }) => {
    const [localWorkType, setLocalWorkType] = useState<DictionaryItemState>(workType);

    useEffect(() => {
        setLocalWorkType(workType);
    }, [workType]);

    const handleFieldChange = (field: keyof DictionaryItemState, value: string | boolean) => {
        setLocalWorkType(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        rememberScroll();

        if (!localWorkType.name.trim()) {
            showNotification({ type: 'error', message: 'Название типа работы не может быть пустым.' });
            return;
        }

        const workTypeDto: WorkTypeUpdateDto = {
            id: localWorkType.id,
            name: localWorkType.name.trim(),
            code: localWorkType.code,
            color: localWorkType.color || "#ffffff",
            active: localWorkType.active,
            description: localWorkType.description,
            type: 'WORK_TYPE'
        };

        try {
            await dictionaryApi.updateWorkType(workTypeDto as DictionaryItemDto);
            await fetchWorkTypes();
            showNotification({ type: 'success', message: `Тип работы "${localWorkType.name}" успешно обновлен!` });
        } catch (err) {
            console.error('Ошибка при сохранении изменений:', err);
            showNotification({ type: 'error', message: 'Ошибка при сохранении данных.' });
            await fetchWorkTypes();
        }
    };

    return (
        <div className="parts-column">
            <h3>Редактирование: {workType.name}</h3>

            <div className="form-group work-type-edit-group" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label htmlFor={`edit-name-${workType.id}`} style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Название услуги
                    </label>
                    <input
                        id={`edit-name-${workType.id}`}
                        type="text"
                        value={localWorkType.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="Название типа работы"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#94a3b8' }}>
                        Системный код (неизменяемый)
                    </label>
                    <h3 style={{ margin: '0', padding: '10px 0', color: '#cbd5e1' }}>{localWorkType.code}</h3>
                </div>

                {/* Поле выбора цвета для редактируемой услуги */}
                <div>
                    <label htmlFor={`edit-color-${workType.id}`} style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Цвет отображения в календаре
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <input
                            id={`edit-color-${workType.id}`}
                            type="color"
                            value={localWorkType.color || "#ffffff"}
                            onChange={(e) => handleFieldChange('color', e.target.value)}
                            style={{ width: '50px', height: '40px', padding: '0', cursor: 'pointer', border: '1px solid #334155', borderRadius: '4px', background: 'none' }}
                        />
                        <span style={{ fontSize: '14px', color: '#94a3b8' }}>{localWorkType.color || "#ffffff"}</span>
                    </div>
                </div>

                <div>
                    <label htmlFor={`edit-desc-${workType.id}`} style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Описание / Заметка
                    </label>
                    <textarea
                        id={`edit-desc-${workType.id}`}
                        value={localWorkType.description}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Дополнительное описание услуги..."
                        rows={4}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#1e293b', color: '#fff', border: '1px solid #334155' }}
                    />
                </div>
            </div>

            <div className="save-button-wrapper" style={{ marginTop: '25px' }}>
                <button type="button" className="save-button" onClick={handleSave} style={{ width: '100%' }}>
                    Сохранить изменения
                </button>
            </div>
        </div>
    );
};


// ---------------------------
// ГЛАВНЫЙ КОМПОНЕНТ
// ---------------------------

const WorkTypeDictionaryManager: React.FC = () => {
    const [workTypes, setWorkTypes] = useState<DictionaryItemState[]>([]);
    const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notification>({
        message: '',
        type: 'success',
        visible: false,
    });

    const showNotification = useCallback((newNotification: Omit<Notification, 'visible'>) => {
        setNotification({ ...newNotification, visible: true });
        const timer = setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const listRef = useRef<HTMLDivElement | null>(null);
    const { rememberScroll, restoreScroll } = useScrollPosition(listRef, "scrollTop_worktype", [workTypes]);

    const fetchWorkTypes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await dictionaryApi.fetchWorkTypes();
            const rawData = response.data as DictionaryRawItem[];

            // Фильтруем только основные типы работ WORK_TYPE, части полностью игнорируем
            const workTypesData = rawData.filter(item => item.type === 'WORK_TYPE');

            const transformedData: DictionaryItemState[] = workTypesData.map(item => ({
                ...item,
                isEditing: false,
                active: item.active ?? true,
                description: item.description ?? '',
                color: item.color || '#3b82f6', // Гарантируем наличие цвета по умолчанию
            }));

            setWorkTypes(transformedData);

            if (!selectedWorkTypeId || !transformedData.some(wt => wt.id === selectedWorkTypeId)) {
                setSelectedWorkTypeId(transformedData[0]?.id ?? null);
            }

            restoreScroll();
        } catch (err) {
            console.error('Ошибка при загрузке справочника:', err);
            setError('Не удалось загрузить справочник. Проверьте соединение или права доступа.');
        } finally {
            setIsLoading(false);
        }
    }, [restoreScroll, selectedWorkTypeId]);

    useEffect(() => {
        fetchWorkTypes();
    }, [fetchWorkTypes]);

    const selectedWorkType = workTypes.find(wt => wt.id === selectedWorkTypeId);

    return (
        <form
            className="order-form dictionary-manager-form"
            onSubmit={(e) => e.preventDefault()}
        >
            <NotificationPopup notification={notification} />

            <div className="dictionary-header-bar">
                <h2 className="dictionary-title">Управление справочником типов работ</h2>
            </div>

            {isLoading && <p className="loading-message">Загрузка данных...</p>}
            {error && <p className="error-message">{error}</p>}

            <hr className="divider"/>

            {!isLoading && !error && (
                <div className="dictionary-content-layout">
                    {/* Левая колонка: Список Услуг */}
                    <WorkTypeTable
                        workTypes={workTypes}
                        selectedId={selectedWorkTypeId}
                        isLoading={isLoading}
                        fetchWorkTypes={fetchWorkTypes}
                        setSelectedId={setSelectedWorkTypeId}
                        listRef={listRef}
                    />

                    {/* Правая колонка: Форма Редактирования параметров и цвета */}
                    {selectedWorkType ? (
                        <WorkTypeEditPanel
                            workType={selectedWorkType}
                            rememberScroll={rememberScroll}
                            fetchWorkTypes={fetchWorkTypes}
                            showNotification={showNotification}
                        />
                    ) : (
                        <div className="parts-column empty-message" style={{ textAlign: 'center' }}>
                            Выберите тип работы для управления его параметрами.
                        </div>
                    )}
                </div>
            )}
        </form>
    );
};

export default WorkTypeDictionaryManager;