import React, {useCallback, useEffect, useRef, useState} from 'react';
import './DictionaryManager.css';
import {WorkType} from '../../types/order';
import {dictionaryApi, DictionaryItemDto, DictionaryRawItem, WorkTypeUpdateDto} from '../../services/dictionaryApi';

// ---------------------------
// ТИПЫ
// ---------------------------

// Тип для частей работы в локальном состоянии (включает active)
type DictionaryPartDto = WorkType & { active: boolean };

// Единый тип для элементов справочника в локальном состоянии
interface DictionaryItemState extends DictionaryItemDto {
    isEditing: boolean;
    description: string;
    active: boolean;
    parts: DictionaryPartDto[];
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

// NotificationPopup: Компонент для отображения уведомлений
const NotificationPopup: React.FC<{ notification: Notification }> = ({ notification }) => {
    const popupClass = `notification-popup ${notification.type} ${notification.visible ? 'visible' : ''}`;
    return (
        <div className={popupClass}>
            {notification.message}
        </div>
    );
};

// ToggleSwitch: предотвращает всплытие
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({checked, onChange}) => (
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
// КОМПОНЕНТЫ ТАБЛИЦ
// ---------------------------

interface WorkTypeTableProps {
    workTypes: DictionaryItemState[];
    selectedId: number | null;
    isLoading: boolean;
    fetchWorkTypes: () => Promise<void>;
    setSelectedId: (id: number | null) => void;
    listRef: React.RefObject<HTMLDivElement | null>;
}

// Таблица Типов Работ (Главный справочник)
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

    const addWorkType = async (e?: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>) => {
        e?.preventDefault();
        if (newWorkTypeName.trim() === '' || newWorkTypeCode.trim() === '') return;

        try {
            await dictionaryApi.addWorkType(newWorkTypeName.trim(), newWorkTypeCode.trim());
            await fetchWorkTypes(); // Перезагружаем для получения актуальных данных и ID
            setNewWorkTypeName('');
            setNewWorkTypeCode('');
        } catch (err) {
            console.error('Ошибка при добавлении типа работы:', err);
            alert('Ошибка при добавлении типа работы.');
        }
    };

    const toggleWorkTypeActiveState = async (itemToToggle: DictionaryItemState) => {
        const updatedItem = { ...itemToToggle, active: !itemToToggle.active };

        try {
            // Используем старый метод updateWorkType для смены статуса активности (без parts)
            const { isEditing, parts, ...workTypeDto } = updatedItem;
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
    }

    const allWorkTypes = workTypes;

    return (
        <div className="work-type-column">
            <div className="form-group add-work-type-group">
                <label>Добавить новый тип работы</label>
                <div className="input-with-button">
                    <input type="text" placeholder="Название типа работы" value={newWorkTypeName}
                           onChange={(e) => setNewWorkTypeName(e.target.value)}
                           onKeyDown={handleKeyDown}
                           disabled={isLoading}/>
                    <input type="text" placeholder="Код" value={newWorkTypeCode}
                           onChange={(e) => setNewWorkTypeCode(e.target.value)}
                           onKeyDown={handleKeyDown}
                           disabled={isLoading}/>
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
                        <th style={{width: '45%'}}>Тип работы</th>
                        <th style={{width: '30%'}} className="hide-on-mobile">Код</th>
                        <th style={{width: '25%', textAlign: 'center'}}>Актив.</th>
                    </tr>
                    </thead>
                    <tbody>
                    {allWorkTypes.length === 0 && (
                        <tr>
                            <td colSpan={3} className="empty-message">Нет данных для отображения.</td>
                        </tr>
                    )}
                    {allWorkTypes.map(item => (
                        <tr key={item.id} className={!item.active ? 'inactive-row' : ''}>
                            <td
                                className={`work-type-name-cell ${item.id === selectedId ? 'selected' : ''}`}
                                onClick={() => setSelectedId(item.id)}
                            >
                                <span>{item.name}</span>
                            </td>
                            <td className="hide-on-mobile">
                                <span>{item.code}</span>
                            </td>
                            <td style={{textAlign: 'center'}}>
                                <ToggleSwitch
                                    checked={item.active}
                                    // ИСПРАВЛЕНИЕ: удален e.preventDefault()
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


interface WorkPartsManagerProps {
    workType: DictionaryItemState;
    setWorkTypes: React.Dispatch<React.SetStateAction<DictionaryItemState[]>>;
    rememberScroll: () => void;
    fetchWorkTypes: () => Promise<void>;
    showNotification: (notification: Omit<Notification, 'visible'>) => void;
}

// Менеджер Частей Работы (Второй справочник)
const WorkPartsManager: React.FC<WorkPartsManagerProps> = ({workType, rememberScroll, fetchWorkTypes, showNotification}) => {
    // Используем локальное состояние для накопления изменений
    const [localWorkType, setLocalWorkType] = useState<DictionaryItemState>(workType);
    const [newPartName, setNewPartName] = useState('');

    useEffect(() => {
        // Обновляем локальное состояние при смене выбранного workType
        setLocalWorkType(workType);
    }, [workType]);

    const handleWorkTypeChange = (field: keyof DictionaryItemState, value: string | boolean) => {
        setLocalWorkType(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePartChange = (partId: number, value: boolean) => {
        setLocalWorkType(prev => ({
            ...prev,
            parts: prev.parts.map(p =>
                p.id === partId ? {...p, active: value} : p
            )
        }));
    };

    const handlePartNameChange = (partId: number, newName: string) => {
        setLocalWorkType(prev => ({
            ...prev,
            parts: prev.parts.map(p =>
                p.id === partId ? {...p, name: newName, code: newName.toUpperCase().replace(/\s/g, '_')} : p
            )
        }));
    };

    const addPart = (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (newPartName.trim() === '') return;

        // Добавление новой части локально
        const newPart: DictionaryPartDto = {
            id: -(Date.now()), // Отрицательный ID для новых элементов
            name: newPartName.trim(),
            code: newPartName.trim().toUpperCase().replace(/\s/g, '_'),
            active: true,
        };

        setLocalWorkType(prev => ({
            ...prev,
            parts: [...prev.parts, newPart]
        }));
        setNewPartName('');
    };

    const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        rememberScroll();

        if (!localWorkType.name.trim() || !localWorkType.code.trim()) {
            showNotification({ type: 'error', message: 'Название и код типа работы не могут быть пустыми.' });
            return;
        }

        // Подготовка данных для отправки в WorkTypeUpdateDto
        const workTypeDto: WorkTypeUpdateDto = {
            id: localWorkType.id,
            name: localWorkType.name.trim(),
            code: localWorkType.code.trim(),
            active: localWorkType.active,
            description: localWorkType.description,
            type: 'WORK_TYPE',
            parts: localWorkType.parts.map(p => ({
                id: p.id > 0 ? p.id : undefined,
                name: p.name,
                code: p.code,
                active: p.active,
                type: localWorkType.code
            })),
        };

        try {
            await dictionaryApi.updateWorkTypeAndParts(workTypeDto);

            // Обновляем главный список и перезагружаем данные для получения новых ID
            await fetchWorkTypes();

            showNotification({ type: 'success', message: `Тип работы "${localWorkType.name}" и его части успешно обновлены!` });

        } catch (err) {
            console.error('Ошибка при сохранении данных:', err);
            showNotification({ type: 'error', message: 'Ошибка при сохранении данных. Попробуйте еще раз.' });
            // В случае ошибки сбрасываем локальные изменения, загружая данные с сервера
            await fetchWorkTypes();
        }
    };

    return (
        <div className="parts-column">
            {/* Редактирование Типа Работ */}
            <h3>Редактирование: {workType.name} ({workType.code})</h3>

            <div className="form-group work-type-edit-group">
                <label htmlFor={`edit-name-${workType.id}`}>Название</label>
                <input
                    id={`edit-name-${workType.id}`}
                    type="text"
                    value={localWorkType.name}
                    onChange={(e) => handleWorkTypeChange('name', e.target.value)}
                    placeholder="Название типа работы"
                />

                <label htmlFor={`edit-code-${workType.id}`}>Код</label>
                <h3>{localWorkType.code}</h3>

            </div>

            <hr className="divider"/>

            {/* Добавление Частей Работ */}
            <div className="add-part-form">
                <input type="text" placeholder="Название новой части" value={newPartName}
                       onChange={(e) => setNewPartName(e.target.value)}
                       onKeyDown={(e) => { if (e.key === 'Enter') addPart(e); }}
                />
                <button type="button" className="add-button" onClick={addPart}
                        disabled={!newPartName.trim()}>
                    + Часть
                </button>
            </div>

            {/* Таблица Частей Работ */}
            <div className="dictionary-table-scroll-container">
                <table className="parts-table">
                    <thead>
                    <tr>
                        <th style={{width: '80%'}}>Название</th>
                        <th style={{width: '20%', textAlign: 'center'}}>Актив.</th>
                    </tr>
                    </thead>
                    <tbody>
                    {localWorkType.parts.length === 0 ? (
                        <tr><td colSpan={2} style={{textAlign: 'center', fontStyle: 'italic'}}>Нет частей. Добавьте первую часть.</td></tr>
                    ) : (
                        localWorkType.parts.map(part => (
                            <tr key={part.id}>
                                <td>
                                    {/* Возможность редактирования названия части */}
                                    <input
                                        type="text"
                                        value={part.name}
                                        onChange={(e) => handlePartNameChange(part.id, e.target.value)}
                                        className={`edit-in-table-input ${!part.active ? 'inactive-part-input' : ''}`}
                                    />
                                </td>
                                <td style={{textAlign: 'center'}}>
                                    <ToggleSwitch
                                        checked={part.active}
                                        // ИСПРАВЛЕНИЕ: удален e.preventDefault()
                                        onChange={() => {
                                            handlePartChange(part.id, !part.active);
                                        }}
                                    />
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            <div className="save-button-wrapper">
                <button type="button" className="save-button" onClick={handleSave}>
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

    // Функция для отображения уведомления
    const showNotification = useCallback((newNotification: Omit<Notification, 'visible'>) => {
        setNotification({ ...newNotification, visible: true });
        const timer = setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
        }, 3000); // Скрыть через 3 секунды
        return () => clearTimeout(timer);
    }, []);

    const listRef = useRef<HTMLDivElement | null>(null);
    const {rememberScroll, restoreScroll} = useScrollPosition(listRef, "scrollTop_worktype", [workTypes]);

    const fetchWorkTypes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await dictionaryApi.fetchWorkTypes();
            const rawData = response.data as DictionaryRawItem[];

            const workTypesData = rawData.filter(item => item.type === 'WORK_TYPE');
            const partsLookup: Record<string, DictionaryPartDto[]> = {};
            const otherItems = rawData.filter(item => item.type !== 'WORK_TYPE');

            // Группируем части по коду родителя
            otherItems.forEach(item => {
                const parentCode = item.type;
                if (!partsLookup[parentCode]) {
                    partsLookup[parentCode] = [];
                }
                partsLookup[parentCode].push({
                    ...(item as WorkType),
                    active: item.active ?? true,
                });
            });

            // Трансформируем данные для состояния
            const transformedData: DictionaryItemState[] = workTypesData.map(item => ({
                ...item,
                parts: partsLookup[item.code] || [],
                isEditing: false,
                active: item.active ?? true,
                description: item.description ?? '',
            }));

            setWorkTypes(transformedData);

            // Сохраняем или сбрасываем выбор
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
                    {/* Левая колонка: Таблица Типов Работ */}
                    <WorkTypeTable
                        workTypes={workTypes}
                        selectedId={selectedWorkTypeId}
                        isLoading={isLoading}
                        fetchWorkTypes={fetchWorkTypes}
                        setSelectedId={setSelectedWorkTypeId}
                        listRef={listRef}
                    />

                    {/* Правая колонка: Менеджер Частей Работ */}
                    {selectedWorkType ? (
                        <WorkPartsManager
                            workType={selectedWorkType}
                            setWorkTypes={setWorkTypes}
                            rememberScroll={rememberScroll}
                            fetchWorkTypes={fetchWorkTypes}
                            showNotification={showNotification}
                        />
                    ) : (
                        <div className="parts-column empty-message" style={{textAlign: 'center'}}>
                            Выберите тип работы для управления его частями.
                        </div>
                    )}
                </div>
            )}
        </form>
    );
};

export default WorkTypeDictionaryManager;