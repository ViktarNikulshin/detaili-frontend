import React, { useEffect, useState, useCallback } from "react";
import { useForm, Controller, SubmitHandler, FieldValues } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useParams } from "react-router-dom";
import { orderAPI } from "../../services/orderApi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./OrderForm.css";
import { userAPI } from "../../services/user";
import { User } from "../../types/user";
import { Order } from "../../types/order";

interface CarBrand {
    id: number;
    name: string;
}

interface CarModel {
    id: number;
    name: string;
}

interface WorkType {
    id: number;
    name: string;
}

interface OrderFormValues {
    clientName: string;
    clientPhone: string;
    carBrand: string;
    carModel: string;
    vin?: string;
    workTypeIds: number[];
    masterIds?: number[];
    executionDate: string;
    orderCost: number;
    executionTimeByMaster?: string | null;
}

const schema: Yup.ObjectSchema<OrderFormValues> = Yup.object().shape({
    clientName: Yup.string().required("Введите имя клиента"),
    clientPhone: Yup.string().required("Введите телефон"),
    carBrand: Yup.string().required("Выберите марку автомобиля"),
    carModel: Yup.string().required("Выберите модель автомобиля"),
    vin: Yup.string().optional(),
    workTypeIds: Yup.array()
        .of(Yup.number().required())
        .min(1, "Выберите хотя бы один тип работ")
        .required("Выберите тип работ"),
    masterIds: Yup.array().of(Yup.number().required()).optional(),
    executionDate: Yup.string().required("Укажите дату выполнения"),
    orderCost: Yup.number().typeError("Введите стоимость заказа").required("Введите стоимость заказа").min(0, "Стоимость не может быть отрицательной"),
    executionTimeByMaster: Yup.string().nullable().optional(),
});

const OrderForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(false);
    const [brands, setBrands] = useState<CarBrand[]>([]);
    const [models, setModels] = useState<CarModel[]>([]);
    const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
    const [masters, setMasters] = useState<User[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);

    const {
        control,
        handleSubmit,
        register,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<OrderFormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            clientName: "",
            clientPhone: "",
            carBrand: "",
            carModel: "",
            vin: "",
            workTypeIds: [],
            masterIds: [],
            executionDate: "",
            orderCost: 0,
            executionTimeByMaster: "",
        },
    });

    const selectedBrandId = watch("carBrand");
    const selectedMasterIds = watch("masterIds");

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Carregar marcas de carros
                const brandsResponse = await orderAPI.getCarBrands();
                const carBrands = brandsResponse.data
                    .filter((brand: any) => brand.name)
                    .map((brand: any) => ({
                        id: brand.id?.toString(),
                        name: brand.name,
                    }))
                    .sort((a: CarBrand, b: CarBrand) => a.name.localeCompare(b.name));
                setBrands(carBrands);

                // Carregar tipos de trabalho
                const workTypesResponse = await orderAPI.getDictionaryByType("WORK_TYPE");
                setWorkTypes(workTypesResponse.data);

                // Carregar mestres
                const mastersResponse = await userAPI.getUsersByRole("MASTER");
                const mastersData = Array.isArray(mastersResponse.data) ? mastersResponse.data : [mastersResponse.data];
                setMasters(mastersData);

            } catch (error) {
                console.error("Ошибка при загрузке начальных данных:", error);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const loadModels = async () => {
            if (!selectedBrandId) {
                setModels([]);
                setValue("carModel", "");
                return;
            }
            setModelsLoading(true);
            try {
                const response = await orderAPI.getCarModel(selectedBrandId);
                const carModels = response.data
                    .filter((model: any) => model.name)
                    .map((model: any) => ({
                        id: model.id.toString(),
                        name: model.name,
                    }))
                    .sort((a: CarModel, b: CarModel) => a.name.localeCompare(b.name));
                setModels(carModels);
            } catch (error) {
                console.error("Ошибка загрузки моделей:", error);
            } finally {
                setModelsLoading(false);
            }
        };
        loadModels();
    }, [selectedBrandId, setValue]);

    useEffect(() => {
        const loadOrder = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const response = await orderAPI.getById(id);
                const order: Order = response.data;

                reset({
                    clientName: order.clientName || "",
                    clientPhone: order.clientPhone || "",
                    carBrand: order.carBrand?.id?.toString() || "",
                    carModel: order.carModel?.id?.toString() || "",
                    vin: order.vin || "",
                    workTypeIds: order.workTypeIds || [],
                    masterIds: order.masterIds || [],
                    executionDate: order.executionDate ? order.executionDate.slice(0, 16) : "",
                    orderCost: order.orderCost || 0,
                    executionTimeByMaster: order.executionTimeByMaster || "",
                });
            } catch (e) {
                console.error("Ошибка загрузки заказа:", e);
            } finally {
                setLoading(false);
            }
        };
        loadOrder();
    }, [id, reset]);

    const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
        try {
            const carBrandObj = brands.find(brand => brand.id.toString() === data.carBrand) || null;
            const carModelObj = models.find(model => model.id.toString() === data.carModel) || null;

            const dataToSend = {
                ...data,
                vin: data.vin || "",
                carBrand: carBrandObj,
                carModel: carModelObj,
                workTypeIds: data.workTypeIds || [],
                masterIds: data.masterIds || [],
            };

            if (id) {
                await orderAPI.update(id, dataToSend);
                alert("Заказ обновлён!");
            } else {
                await orderAPI.create(dataToSend);
                alert("Заказ создан!");
            }
        } catch (error) {
            console.error("Ошибка сохранения:", error);
            alert("Произошла ошибка при сохранении заказа.");
        }
    };

    const handleCheckboxChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        currentValues: number[],
        onChange: (newValues: number[]) => void
    ) => {
        const id = Number(e.target.value);
        const newValues = e.target.checked
            ? [...currentValues, id]
            : currentValues.filter((value) => value !== id);
        onChange(newValues);
    };

    const getMasterNames = useCallback((ids: number[] | undefined) => {
        if (!ids || ids.length === 0) return "Не выбраны";
        return ids.map(id => {
            const master = masters.find(m => m.id === id);
            return master ? `${master.firstName} ${master.lastName}` : `Мастер ${id}`;
        }).join(", ");
    }, [masters]);


    if (loading) return <p>Загрузка...</p>;

    return (
        <form onSubmit={handleSubmit(onSubmit as SubmitHandler<FieldValues>)} className="order-form">
            {/* Client Name */}
            <input
                type="text"
                placeholder="Имя клиента"
                {...register("clientName")}
                className={errors.clientName ? "error" : ""}
            />
            {errors.clientName && <span className="error-text">{errors.clientName.message}</span>}

            {/* Client Phone */}
            <Controller
                name="clientPhone"
                control={control}
                render={({ field }) => (
                    <PhoneInput
                        {...field}
                        country={"by"}
                        onlyCountries={["by", "ru", "ua", "pl", "lt"]}
                        placeholder="Телефон"
                        inputStyle={{ width: "100%", height: "52px" }}
                    />
                )}
            />
            {errors.clientPhone && <span className="error-text">{errors.clientPhone.message}</span>}

            <div className="form-group">
            <select {...register("carBrand")} className={errors.carBrand ? "error" : ""}>
                <option value="">Выберите марку автомобиля</option>
                {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
            </select>
                {errors.carBrand && <span className="error-text">{errors.carBrand.message}</span>}
            </div>

            <div className="form-group">
            <select {...register("carModel")} disabled={!selectedBrandId || modelsLoading} className={errors.carModel ? "error" : ""}>
                <option value="">{modelsLoading ? "Загрузка моделей..." : "Выберите модель автомобиля"}</option>
                {models.map((model) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                ))}
            </select>
            {errors.carModel && <span className="error-text">{errors.carModel.message}</span>}
            </div>

            <input type="text" placeholder="VIN (необязательно)" {...register("vin")} className={errors.vin ? "error" : ""} />
            {errors.vin && <span className="error-text">{errors.vin.message}</span>}

            <div className="checkbox-group">
                <label>Тип работ:</label>
                <Controller
                    name="workTypeIds"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <div className="checkbox-container">
                            {workTypes.map((workType) => (
                                <div key={workType.id} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id={`work-type-${workType.id}`}
                                        value={workType.id}
                                        checked={value.includes(workType.id)}
                                        onChange={(e) => handleCheckboxChange(e, value, onChange)}
                                    />
                                    <label htmlFor={`work-type-${workType.id}`}>{workType.name}</label>
                                </div>
                            ))}
                        </div>
                    )}
                />
                {errors.workTypeIds && <span className="error-text">{errors.workTypeIds.message}</span>}
            </div>

            <div className="checkbox-group">
                <label>Мастера (необязательно):</label>
                <Controller
                    name="masterIds"
                    control={control}
                    render={({ field: { onChange, value = [] } }) => (
                        <div className="checkbox-container">
                            {masters.map((master) => (
                                <div key={master.id} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id={`master-${master.id}`}
                                        value={master.id}
                                        checked={value.includes(master.id)}
                                        onChange={(e) => handleCheckboxChange(e, value, onChange)}
                                    />
                                    <label htmlFor={`master-${master.id}`}>{master.firstName} {master.lastName}</label>
                                </div>
                            ))}
                        </div>
                    )}
                />
                {errors.masterIds && <span className="error-text">{errors.masterIds.message}</span>}
            </div>

            {selectedMasterIds && selectedMasterIds.length > 0 && (
                <div className="selected-masters-display">
                    <p>Выбраны мастера: <strong>{getMasterNames(selectedMasterIds)}</strong></p>
                </div>
            )}

            <input type="datetime-local" {...register("executionDate")} className={errors.executionDate ? "error" : ""} />
            {errors.executionDate && <span className="error-text">{errors.executionDate.message}</span>}

            <input type="number" placeholder="Стоимость заказа" {...register("orderCost", { valueAsNumber: true })} className={errors.orderCost ? "error" : ""} />
            {errors.orderCost && <span className="error-text">{errors.orderCost.message}</span>}

            <input type="text" placeholder="Время выполнения (например, 2 часа)" {...register("executionTimeByMaster")} className={errors.executionTimeByMaster ? "error" : ""} />
            {errors.executionTimeByMaster && <span className="error-text">{errors.executionTimeByMaster.message}</span>}

            <button type="submit" disabled={loading}>
                {id ? "Обновить заказ" : "Сохранить заказ"}
            </button>
        </form>
    );
};

export default OrderForm;