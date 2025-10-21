import React, {useCallback, useEffect, useState} from 'react';
import './OrderForm.css';
import './DictionaryManager.css';
import {WorkType} from '../../types/order';
import {dictionaryApi, DictionaryItemDto, DictionaryRawItem} from '../../services/dictionaryApi';

interface DictionaryItemState extends DictionaryItemDto {
    isEditing: boolean;
    description: string;
}

type DictionaryPartDto = WorkType;


const WorkTypeDictionaryManager: React.FC = () => {
    const [workTypes, setWorkTypes] = useState<DictionaryItemState[]>([]);
    const [newWorkTypeName, setNewWorkTypeName] = useState('');
    // Добавляем новое состояние для кода нового типа работы
    const [newWorkTypeCode, setNewWorkTypeCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkTypes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await dictionaryApi.fetchWorkTypes();
            const rawData = response.data as DictionaryRawItem[];

            // 1. Фильтруем основные типы работ
            const workTypesData = rawData.filter(item => item.type === 'WORK_TYPE');
            const partsLookup: Record<string, WorkType[]> = {};
            const otherItems = rawData.filter(item => item.type !== 'WORK_TYPE');

            otherItems.forEach(item => {
                // 'type' части совпадает с 'code' родительского WORK_TYPE
                const parentCode = item.type;
                if (!partsLookup[parentCode]) {
                    partsLookup[parentCode] = [];
                }
                partsLookup[parentCode].push(item as WorkType);
            });
            const transformedData: DictionaryItemState[] = workTypesData.map(item => ({
                ...item,
                parts: partsLookup[item.code] || [],
                isEditing: false,
            } as DictionaryItemState));

            setWorkTypes(transformedData);
        } catch (err) {
            console.error('Ошибка при загрузке справочника:', err);
            setError('Не удалось загрузить справочник. Проверьте соединение или права доступа.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkTypes();
    }, [fetchWorkTypes]);

    const addWorkType = async () => {
        // Проверяем оба поля: имя и код
        if (newWorkTypeName.trim() === '' || newWorkTypeCode.trim() === '') return;

        setIsLoading(true);
        try {
            // Передаем и имя, и код в API вызов
            const response = await dictionaryApi.addWorkType(newWorkTypeName.trim(), newWorkTypeCode.trim());
            const newWorkType = response.data;

            const newItemState: DictionaryItemState = {
                ...newWorkType,
                isEditing: false,
                parts: newWorkType.parts || [],
                description: newWorkType.description || '',
            };
            setWorkTypes(prev => [...prev, newItemState]);
            setNewWorkTypeName('');
            setNewWorkTypeCode(''); // Очищаем поле кода после добавления
        } catch (err) {
            console.error('Ошибка при добавлении типа работы:', err);
            setError('Ошибка при добавлении типа работы.');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteWorkType = async (id: number) => {
        if (!window.confirm(`Вы уверены, что хотите удалить тип работы с ID: ${id}?`)) return;

        setIsLoading(true);
        try {
            await dictionaryApi.deleteWorkType(id);
            setWorkTypes(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error('Ошибка при удалении типа работы:', err);
            setError('Ошибка при удалении типа работы. Возможно, он используется в заказах.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveWorkType = async (itemToSave: DictionaryItemState) => {
        setWorkTypes(workTypes.map(item =>
            item.id === itemToSave.id ? {...itemToSave, isEditing: false} : item
        ));

        setIsLoading(true);
        try {
            const {isEditing, ...workTypeDto} = itemToSave;
            await dictionaryApi.updateWorkType(workTypeDto);
        } catch (err) {
            console.error('Ошибка при сохранении данных:', err);
            setError('Ошибка при сохранении данных. Проверьте введенные данные.');
            setWorkTypes(workTypes.map(item =>
                item.id === itemToSave.id ? {...itemToSave, isEditing: true} : item
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleEdit = (id: number) => {
        setWorkTypes(workTypes.map(wt =>
            wt.id === id ? {...wt, isEditing: !wt.isEditing} : wt
        ));
    };

    const addPartToWorkType = (workTypeId: number, partName: string) => {
        if (partName.trim() === '') return;

        const newPart: DictionaryPartDto = {
            id: -(Date.now()),
            name: partName.trim(),
            code: partName.trim().toUpperCase().replace(/\s/g, '_'),
        };

        setWorkTypes(prev => prev.map(workType => {
            if (workType.id === workTypeId) {
                return {...workType, parts: [...workType.parts, newPart]};
            }
            return workType;
        }));
    };

    const deletePart = (workTypeId: number, partId: number) => {
        setWorkTypes(prev => prev.map(workType => {
            if (workType.id === workTypeId) {
                return {
                    ...workType,
                    parts: workType.parts.filter(part => part.id !== partId),
                };
            }
            return workType;
        }));
    };


    // --- Компонент для отображения одной Части ---
    const PartItem: React.FC<{ part: DictionaryPartDto, workTypeId: number, isEditing: boolean }> =
        ({part, workTypeId, isEditing}) => (
            <li className="part-item">
                <span>{part.name}</span>
                {isEditing && (
                    <button
                        type="button"
                        className="delete-button delete-part"
                        onClick={() => deletePart(workTypeId, part.id)}
                        title="Удалить часть (сохранится после нажатия 'Сохранить')"
                    >
                        &times;
                    </button>
                )}
            </li>
        );

    // --- Компонент для отображения одного Типа Работы ---
    const WorkTypeItem: React.FC<{ item: DictionaryItemState }> = ({item}) => {
        const [newPartName, setNewPartName] = useState('');
        const [editedName, setEditedName] = useState(item.name);
        // Добавляем состояние для редактируемого кода
        const [editedCode, setEditedCode] = useState(item.code || '');

        useEffect(() => {
            setEditedName(item.name);
            setEditedCode(item.code || '');
        }, [item.name, item.code]);

        const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setEditedName(e.target.value);
            setWorkTypes(prev => prev.map(wt =>
                wt.id === item.id ? {...wt, name: e.target.value} : wt
            ));
        };

        // Обработчик изменения кода
        const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setEditedCode(e.target.value);
            setWorkTypes(prev => prev.map(wt =>
                wt.id === item.id ? {...wt, code: e.target.value} : wt
            ));
        };

        const handleSave = () => {
            // Проверка имени и кода
            if (!editedName.trim() || !editedCode.trim()) return;

            const itemToSave: DictionaryItemState = {
                ...item,
                name: editedName,
                code: editedCode, // Сохраняем код
            };
            handleSaveWorkType(itemToSave);
        };

        const handleCancel = () => {
            fetchWorkTypes();
            toggleEdit(item.id);
        };

        const handleAddPart = () => {
            addPartToWorkType(item.id, newPartName);
            setNewPartName('');
        }

        const handlePartKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                handleAddPart();
            }
        }

        return (
            <div className="dictionary-item">
                <div className="item-header">
                    {item.isEditing ? (
                        <div className="edit-work-type-fields">
                            <input
                                type="text"
                                className="work-type-input name-input"
                                value={editedName}
                                onChange={handleNameChange}
                                placeholder="Название"
                            />
                            {/* Поле для редактирования кода */}
                            <input
                                type="text"
                                className="work-type-input code-input"
                                value={editedCode}
                                onChange={handleCodeChange}
                                placeholder="Код"
                            />
                            <button
                                type="button"
                                className="save-button"
                                onClick={handleSave}
                                disabled={!editedName.trim() || !editedCode.trim()} // Отключаем, если пустое
                            >
                                Сохранить
                            </button>
                            <button type="button" className="cancel-button" onClick={handleCancel}>
                                Отмена
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="item-name">{item.name} <span className="item-code">({item.code})</span></span>
                            <div className="item-actions">
                                <button type="button" className="edit-button" onClick={() => toggleEdit(item.id)}>
                                    Изменить
                                </button>
                                <button type="button" className="delete-button" onClick={() => deleteWorkType(item.id)}>
                                    Удалить
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="nested-parts-container">
                    <label className="nested-label">Части работы:</label>
                    <ul className="parts-list">
                        {item.parts.map(part => (
                            <PartItem
                                key={part.id}
                                part={part}
                                workTypeId={item.id}
                                isEditing={item.isEditing}
                            />
                        ))}
                    </ul>
                    {item.isEditing && (
                        <div className="add-part-form">
                            <input
                                type="text"
                                placeholder="Название части"
                                value={newPartName}
                                onChange={(e) => setNewPartName(e.target.value)}
                                onKeyDown={handlePartKeyDown}
                            />
                            <button
                                type="button"
                                className="add-button"
                                onClick={handleAddPart}
                                disabled={!newPartName.trim()}
                            >
                                + Часть
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- Главный рендер ---
    return (
        <div className="order-form dictionary-manager-form">
            <h2>Управление справочником типов работ</h2>

            {isLoading && <p className="loading-message">Загрузка данных...</p>}

            {error && <p className="error-message">{error}</p>}

            {/* Форма добавления нового Типа Работы */}
            <div className="form-group add-work-type-group">
                <label>Добавить новый тип работы</label>
                <div className="input-with-button">
                    {/* Поле для названия */}
                    <input
                        type="text"
                        placeholder="Название типа работы"
                        value={newWorkTypeName}
                        onChange={(e) => setNewWorkTypeName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                addWorkType();
                            }
                        }}
                        disabled={isLoading}
                    />
                    {/* Поле для кода */}
                    <input
                        type="text"
                        placeholder="Код типа работы"
                        value={newWorkTypeCode}
                        onChange={(e) => setNewWorkTypeCode(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                addWorkType();
                            }
                        }}
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        className="add-button"
                        onClick={addWorkType}
                        // Добавляем проверку на код
                        disabled={!newWorkTypeName.trim() || !newWorkTypeCode.trim() || isLoading}
                    >
                        Добавить
                    </button>
                </div>
            </div>

            <hr className="divider"/>

            {/* Список существующих Типов Работ */}
            {!isLoading && !error && (
                <div className="form-group">
                    <label>Существующие типы работ</label>
                    <div className="dictionary-list-container">
                        {workTypes.length === 0 ? (
                            <p className="empty-message">Нет добавленных типов работ.</p>
                        ) : (
                            workTypes.map(item => (
                                <WorkTypeItem key={item.id} item={item}/>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkTypeDictionaryManager;