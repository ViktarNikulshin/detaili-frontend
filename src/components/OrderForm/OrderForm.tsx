import React, {useCallback, useEffect, useState} from "react";
import {Controller, FieldValues, SubmitHandler, useForm} from "react-hook-form";
import * as Yup from "yup";
import {yupResolver} from "@hookform/resolvers/yup";
import {useNavigate, useParams} from "react-router-dom";
import {orderAPI, OrderPayload} from "../../services/orderApi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./OrderForm.css";
import {userAPI} from "../../services/userApi";
import {User} from "../../types/user";
import {CarBrand, Order, Work, WorkType} from "../../types/order";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {format, parseISO} from 'date-fns';

type Notification = {
    message: string;
    type: 'success' | 'error';
    visible: boolean;
}

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil"
         viewBox="0 0 16 16">
        <path
            d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V12h2.293z"/>
    </svg>
);

// ✅ ИСПРАВЛЕНИЕ: Схема для infoSource изменена на объект (WorkType) или null
const InfoSourceSchema = Yup.object().shape({
    id: Yup.number().required(),
    name: Yup.string().optional(),
    code: Yup.string().optional(),
}).nullable();

const schema = Yup.object().shape({
    clientName: Yup.string().required("Введите имя клиента"),
    clientPhone: Yup.string().required("Введите телефон"),
    carBrand: Yup.string().required("Выберите марку автомобиля"),
    vin: Yup.string().nullable().optional().default(null),
    works: Yup.array()
        .of(
            Yup.object().shape({
                id: Yup.number().optional(),
                workType: Yup.object().shape({
                    id: Yup.number().required(),
                    name: Yup.string().required(),
                    code: Yup.string().required(),
                }).required(),
                parts: Yup.array().of(
                    Yup.object().shape({
                        id: Yup.number().required(),
                    })
                ).required(),
                comment: Yup.string().nullable().optional(),
            })
        )
        .min(1, "Выберите хотя бы один тип работ")
        .required(),
    masterIds: Yup.array().of(Yup.number().required()).optional().default([]),

    // ✅ ИСПРАВЛЕНИЕ: Используем новую схему для одного объекта или null
    infoSource: InfoSourceSchema.optional().default(null),

    executionDate: Yup.string().required("Укажите дату выполнения"),
    orderCost: Yup.number().typeError("Введите стоимость заказа").required("Введите стоимость заказа").min(0, "Стоимость не может быть отрицательной"),
    executionTimeByMaster: Yup.string().nullable().default(null),
});

type OrderFormValues = Yup.InferType<typeof schema>;

const OrderForm: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [brands, setBrands] = useState<CarBrand[]>([]);
    const [allWorkTypes, setAllWorkTypes] = useState<WorkType[]>([]);
    const [masters, setMasters] = useState<User[]>([]);
    const [editingCommentForWork, setEditingCommentForWork] = useState<number | null>(null);

    const [infoSourcesDict, setInfoSourcesDict] = useState<WorkType[]>([]);

    const [dynamicWorkParts, setDynamicWorkParts] = useState<Record<number, WorkType[]>>({});
    const [loadingParts, setLoadingParts] = useState<Record<number, boolean>>({});
    const [notification, setNotification] = useState<Notification>({
        message: '',
        type: 'success',
        visible: false,
    });

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({message, type, visible: true});
        setTimeout(() => {
            setNotification(prev => ({...prev, visible: false}));
        }, 2000);
    };

    const {
        control,
        handleSubmit,
        register,
        reset,
        watch,
        setValue,
        formState: {errors},
    } = useForm<OrderFormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            clientName: "",
            clientPhone: "",
            carBrand: "",
            vin: null,
            works: [],
            masterIds: [],
            // ✅ ИСПРАВЛЕНИЕ: Значение по умолчанию для одного объекта
            infoSource: null,
            executionDate: "",
            orderCost: 0,
            executionTimeByMaster: null,
        },
    });

    const selectedWorks = watch("works");
    // ✅ ИСПРАВЛЕНИЕ: watch теперь возвращает один объект или null
    const selectedInfoSource = watch("infoSource");


    const fetchPartsForWork = useCallback(async (workType: WorkType) => {
        if (dynamicWorkParts[workType.id] !== undefined) {
            return dynamicWorkParts[workType.id] || [];
        }

        if (!workType.code) return [];

        setLoadingParts(prev => ({...prev, [workType.id]: true}));
        try {
            const response = await orderAPI.getDictionaryByType(workType.code);
            const parts = response.data || [];

            setDynamicWorkParts(prev => ({
                ...prev,
                [workType.id]: parts
            }));
            return parts;
        } catch (error) {
            console.error(`Ошибка загрузки частей для типа работы ${workType.code}:`, error);
            setDynamicWorkParts(prev => ({...prev, [workType.id]: []}));
            return [];
        } finally {
            setLoadingParts(prev => ({...prev, [workType.id]: false}));
        }
    }, [dynamicWorkParts, setLoadingParts, setDynamicWorkParts]);


    useEffect(() => {
        const loadDictionaries = async () => {
            try {
                const [brandsRes, workTypesRes, mastersRes, infoSourcesRes] = await Promise.all([
                    orderAPI.getCarBrands(),
                    orderAPI.getDictionaryByType("WORK_TYPE"),
                    userAPI.getUsersByRole("MASTER"),
                    orderAPI.getDictionaryByType("INFO"),
                ]);
                setBrands(brandsRes.data.sort((a: CarBrand, b: CarBrand) => a.name.localeCompare(b.name)));
                setAllWorkTypes(workTypesRes.data);
                setMasters(Array.isArray(mastersRes.data) ? mastersRes.data : [mastersRes.data]);
                setInfoSourcesDict(infoSourcesRes.data);
            } catch (error) {
                console.error("Ошибка при загрузке справочников:", error);
            }
        };
        loadDictionaries();
    }, []);

    useEffect(() => {
        if (!id) return;
        const loadOrder = async () => {
            setLoading(true);
            try {
                // Предполагаем, что API возвращает infoSource как объект или null
                const response = await orderAPI.getById(id);
                const order: Order & { infoSource?: WorkType | null } = response.data;

                const partsLoadingPromises = order.works.map(work =>
                    fetchPartsForWork(work.workType)
                );
                await Promise.all(partsLoadingPromises);

                const executionDate = order.executionDate ? format(parseISO(order.executionDate), "yyyy-MM-dd'T'HH:mm") : "";
                reset({
                    ...order,
                    carBrand: order.carBrand?.id.toString() || "",
                    infoSource: order.infoSource || null, // ✅ ЗАГРУЗКА ОДНОГО ИСТОЧНИКА
                    executionDate,
                } as OrderFormValues);
            } catch (e) {
                console.error("Ошибка загрузки заказа:", e);
            } finally {
                setLoading(false);
            }
        };
        if (allWorkTypes.length > 0) {
            loadOrder();
        }
    }, [id, reset, allWorkTypes, fetchPartsForWork]);

    const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
        try {
            const carBrandObj = brands.find(brand => brand.id.toString() === data.carBrand) || null;

            const transformedWorks = data.works;

            // ✅ ИСПРАВЛЕНИЕ: infoSource уже является объектом WorkType | null
            const dataToSend: OrderPayload & { infoSource: WorkType | null } = {
                ...data,
                works: transformedWorks as Work[],
                carBrand: carBrandObj,
                vin: data.vin || "",
                infoSource: data.infoSource, // Передаем один объект или null
            } as OrderPayload & { infoSource: WorkType | null };

            if (id) {
                await orderAPI.update(id, dataToSend);
                showNotification("Заказ успешно обновлён!", 'success');
            } else {
                await orderAPI.create(dataToSend);
                showNotification("Заказ успешно создан!", 'success');
            }

            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (error) {
            console.error("Ошибка сохранения:", error);
            showNotification("Произошла ошибка при сохранении заказа!", 'error');
        }
    };

    const handleWorkTypeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const workTypeId = Number(e.target.value);
        const isChecked = e.target.checked;
        const currentWorks = watch("works");

        if (isChecked) {
            const workTypeToAdd = allWorkTypes.find(wt => wt.id === workTypeId);
            if (workTypeToAdd) {
                const newWork: Work = {
                    workType: workTypeToAdd,
                    parts: [],
                    comment: "",
                };
                setValue("works", [...currentWorks, newWork], {shouldValidate: true});

                if (workTypeToAdd.code) {
                    await fetchPartsForWork(workTypeToAdd);
                }
            }
        } else {
            const updatedWorks = currentWorks.filter(w => w.workType.id !== workTypeId);
            setValue("works", updatedWorks, {shouldValidate: true});

            setDynamicWorkParts(prev => {
                const newState = {...prev};
                delete newState[workTypeId];
                return newState;
            });
        }
    };

    const handleWorkPartChange = (workTypeId: number, partId: number, isChecked: boolean) => {
        const workInForm = selectedWorks.find(w => w.workType.id === workTypeId);
        if (!workInForm) return;

        const partsForThisWork = dynamicWorkParts[workTypeId] || [];
        const partObject = partsForThisWork.find(p => p.id === partId);

        if (!partObject) return;

        const updatedWorks = selectedWorks.map(work => {
            if (work.workType.id === workTypeId) {
                let updatedParts = work.parts;

                if (isChecked) {
                    if (!updatedParts.some(p => p.id === partId)) {
                        updatedParts = [...work.parts, partObject];
                    }
                } else {
                    updatedParts = work.parts.filter(p => p.id !== partId);
                }
                return {...work, parts: updatedParts};
            }
            return work;
        });

        setValue("works", updatedWorks, {shouldValidate: true});
    };

    // ✅ ИСПРАВЛЕНИЕ: НОВАЯ ФУНКЦИЯ ДЛЯ ОБРАБОТКИ РАДИОКНОПОК ИСТОЧНИКОВ ИНФОРМАЦИИ
    const handleInfoSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const infoId = Number(e.target.value);
        const sourceObject = infoSourcesDict.find(s => s.id === infoId);

        if (sourceObject) {
            // Устанавливаем выбранный объект
            setValue("infoSource", sourceObject, {shouldValidate: true});
        } else {
            // Устанавливаем null, если объект не найден или нужна логика сброса (хотя для радиокнопок это редкость)
            setValue("infoSource", null, {shouldValidate: true});
        }
    };

    const handleCommentChange = (workTypeId: number, newComment: string) => {
        const updatedWorks = selectedWorks.map(work =>
            work.workType.id === workTypeId ? {...work, comment: newComment} : work
        );
        setValue("works", updatedWorks, {shouldValidate: true});
    };

    const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masterId = Number(e.target.value);
        const isChecked = e.target.checked;
        const currentMasterIds = watch("masterIds") || [];

        const newMasterIds = isChecked
            ? [...currentMasterIds, masterId]
            : currentMasterIds.filter(id => id !== masterId);

        setValue("masterIds", newMasterIds);
    };


    if (loading && id) return <p>Загрузка заказа...</p>;

    return (
        <> {/* Оберните все во фрагмент */}
            {/* 1. УВЕДОМЛЕНИЕ ВЫНЕСЕНО ИЗ ФОРМЫ */}
            {notification.visible && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}
            <form onSubmit={handleSubmit(onSubmit as SubmitHandler<FieldValues>)} className="order-form">


                <input type="text" placeholder="Имя клиента" {...register("clientName")}
                       className={errors.clientName ? "error" : ""}/>
                {errors.clientName && <span className="error-text">{errors.clientName.message}</span>}

                {/* ГРУППА ТЕЛЕФОНА */}
                <div className="form-group">
                    <Controller name="clientPhone" control={control} render={({field}) => (
                        <PhoneInput {...field} country={"by"} onlyCountries={["by", "ru", "ua", "pl", "lt"]}
                                    placeholder="Телефон" inputStyle={{width: "100%", height: "52px"}}/>
                    )}/>
                    {errors.clientPhone && <span className="error-text">{errors.clientPhone.message}</span>}
                </div>

                {/* ✅ СЕКЦИЯ: ИСТОЧНИКИ ИНФОРМАЦИИ (RADIO BUTTONS) */}
                {infoSourcesDict.length > 0 && (
                    <div className="checkbox-group info-source-group">
                        <label>Откуда узнали о нас (выберите один вариант):</label>
                        <div className="checkbox-container">
                            {infoSourcesDict.map((source) => (
                                <div key={source.id} className="checkbox-item">
                                    <input
                                        // ✅ ИСПРАВЛЕНИЕ: Используем radio вместо checkbox
                                        type="radio"
                                        name="infoSource" // Важно: одинаковый name для группы радиокнопок
                                        id={`info-source-${source.id}`}
                                        value={source.id}
                                        // ✅ Проверяем, совпадает ли ID текущего источника с ID выбранного объекта
                                        checked={selectedInfoSource?.id === source.id}
                                        onChange={handleInfoSourceChange}
                                    />
                                    <label htmlFor={`info-source-${source.id}`}>{source.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* КОНЕЦ ИСПРАВЛЕННОЙ СЕКЦИИ */}

                {/* ГРУППА МАРКИ АВТО */}
                <div className="form-group">
                    <select {...register("carBrand")} className={errors.carBrand ? "error" : ""}>
                        <option value="">Выберите марку автомобиля</option>
                        {brands.map((brand) => (<option key={brand.id} value={brand.id}>{brand.name}</option>))}
                    </select>
                    {errors.carBrand && <span className="error-text">{errors.carBrand.message}</span>}

                </div>
                <input type="text" placeholder="VIN (необязательно)" {...register("vin")} />

                <div className="checkbox-group">
                    <label>Тип работ:</label>
                    <div className="checkbox-container">
                        {allWorkTypes.map((workType) => {
                            const workInForm = selectedWorks.find(w => w.workType.id === workType.id);
                            const isChecked = !!workInForm;
                            return (
                                <div key={workType.id} className="work-type-wrapper">
                                    <div className="checkbox-item-with-comment">
                                        <div className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                id={`work-type-${workType.id}`}
                                                value={workType.id}
                                                checked={isChecked}
                                                onChange={handleWorkTypeChange}
                                            />
                                            <label htmlFor={`work-type-${workType.id}`}>{workType.name}</label>
                                        </div>
                                        {isChecked && (
                                            <button type="button" className="edit-comment-btn"
                                                    onClick={() => setEditingCommentForWork(editingCommentForWork === workType.id ? null : workType.id)}>
                                                <PencilIcon/>
                                            </button>
                                        )}
                                    </div>

                                    {isChecked && editingCommentForWork === workType.id && (
                                        <div className="comment-input-container">
                                            <input
                                                type="text"
                                                className="comment-input"
                                                placeholder="Добавить комментарий..."
                                                value={workInForm?.comment || ""}
                                                onChange={(e) => handleCommentChange(workType.id, e.target.value)}
                                            />
                                            <button type="button" className="comment-save-btn"
                                                    onClick={() => setEditingCommentForWork(null)}>Готово
                                            </button>
                                        </div>
                                    )}

                                    {/* ДИНАМИЧЕСКИЕ ЧЕКБОКСЫ ДЛЯ ЧАСТЕЙ */}
                                    {isChecked && (dynamicWorkParts[workType.id] || []).length > 0 && (
                                        <div className="checkbox-group dynamic-parts-group">
                                            <br/>
                                            <label className="dynamic-parts-label">
                                                Выберите детали ({workType.name}):
                                            </label>
                                            {loadingParts[workType.id] ? (
                                                <p className="dynamic-parts-loading">Загрузка деталей...</p>
                                            ) : (
                                                <div className="checkbox-container small-checkbox-container">
                                                    {(dynamicWorkParts[workType.id] || []).map((part) => (
                                                        <div key={part.id}
                                                             className="checkbox-item small-checkbox-item">
                                                            <input
                                                                type="checkbox"
                                                                id={`part-${workType.id}-${part.id}`}
                                                                value={part.id}
                                                                checked={workInForm.parts.some(p => p.id === part.id)}
                                                                onChange={(e) => handleWorkPartChange(workType.id, part.id, e.target.checked)}
                                                            />
                                                            <label
                                                                htmlFor={`part-${workType.id}-${part.id}`}>{part.name}</label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {errors.works && <span className="error-text">{(errors.works as any).message}</span>}
                </div>

                <div className="checkbox-group">
                    <label>Мастера (необязательно):</label>
                    <div className="checkbox-container">
                        {masters.map((master) => (
                            <div key={master.id} className="checkbox-item">
                                <input
                                    type="checkbox"
                                    id={`master-${master.id}`}
                                    value={master.id}
                                    checked={(watch("masterIds") || []).includes(master.id)}
                                    onChange={handleMasterChange}
                                />
                                <label htmlFor={`master-${master.id}`}>{master.firstName} {master.lastName}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-group order-form-date-cost">
                    <div className="form-group-half">
                        <label>Дата и время выполнения 📅:</label>
                        <Controller name="executionDate" control={control} render={({field}) => (
                            <DatePicker
                                selected={field.value ? parseISO(field.value) : null}
                                onChange={(date: Date | null) => field.onChange(date ? format(date, "yyyy-MM-dd'T'HH:mm") : "")}
                                showTimeSelect timeFormat="HH:mm" dateFormat="dd.MM.yyyy HH:mm"
                                placeholderText="Выберите дату"
                                className={errors.executionDate ? "error" : ""}
                            />
                        )}/>
                        {errors.executionDate && <span className="error-text">{errors.executionDate.message}</span>}
                    </div>
                    <div className="form-group-half">
                        <label htmlFor="orderCost">Стоимость заказа:</label>
                        <input id="orderCost" type="number"
                               placeholder="Стоимость" {...register("orderCost", {valueAsNumber: true})}
                               className={errors.orderCost ? "error" : ""}/>
                        {errors.orderCost && <span className="error-text">{errors.orderCost.message}</span>}
                    </div>
                </div>

                <input type="text"
                       placeholder="Время выполнения (например, 2 часа)" {...register("executionTimeByMaster")} />

                <button type="submit" disabled={loading}>{id ? "Обновить заказ" : "Сохранить заказ"}</button>
            </form>
        </>
    );
};

export default OrderForm;